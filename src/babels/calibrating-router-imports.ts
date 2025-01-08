// src/index.ts

import { createHash } from "crypto";
import { PluginObj, NodePath, PluginPass, types as t } from "@babel/core";
import { TOOLING_FILE_NAME } from "../helpers/utils";
import path from "path";
import {
    createFuncDeclaration,
    createInlineImportStatement,
    trackFunctionCalls,
    trackVariableCalls
} from "./services";


/**
 * The main Babel plugin.
 * @param param0 - An object containing Babel types.
 * @returns A Babel Plugin Object.
 */
export default function({ types: t }: { types }): PluginObj {
    // Construct the require statement with a template literal
    const toolingEndpoint = path.join("/", TOOLING_FILE_NAME);
    const requireStatement = t.variableDeclaration("const", [
        t.variableDeclarator(
            t.objectPattern([
                t.objectProperty(t.identifier("local_import"), t.identifier("local_import")),
                t.objectProperty(t.identifier("external_import"), t.identifier("external_import")),
            ]),
            t.callExpression(t.identifier("require"), [
                t.templateLiteral(
                    [
                        t.templateElement({ raw: "", cooked: "" }, false),
                        t.templateElement({ raw: toolingEndpoint, cooked: toolingEndpoint }, true),
                    ],
                    [t.identifier("__hooks")]
                ),
            ])
        ),
    ]);



    // Map to store local functions
    const localFunctionsMap = new Map<string, t.Node>();

    return {
        visitor: {
            Program(path: NodePath<t.Program>, state: PluginPass) {
                const importMap = new Map<string, string>();
                const localFunctions = new Map<string, t.Node>();

                // no need because the typescript will clean this up for ya
                const _localFunctionsMarkedDeleted = new Map<string, any>();
                const localVariables = new Map<string, t.Node>()

                const cwd = state.file.opts.filename || "";
                const declaredFunctionNames = new Set<string>();

                // Find all local function declarations
                path.traverse({
                    FunctionDeclaration(path: NodePath<t.FunctionDeclaration>) {
                        const funcName = path.node.id?.name;
                        if (funcName) {
                            localFunctions.set(funcName, path.node);
                        }
                    },

                    FunctionExpression(path: NodePath<t.FunctionExpression>) {
                        const funcName = path.node.id ? path.node.id.name : "anonymous";
                        localFunctions.set(funcName, path.node);
                    },

                    // Capture arrow functions (anonymous functions or named arrow functions)
                    ArrowFunctionExpression(path: NodePath<t.ArrowFunctionExpression>) {
                        // If it's a named arrow function
                        const parent = path.findParent((parent: t.Node) => parent.isVariableDeclarator());
                        if (parent && t.isVariableDeclarator(parent.node)) {
                            // The name of the variable holding the anonymous function
                            const varName = parent.node.id.name;
                            localFunctions.set(varName, path.node);
                        } else {
                            // Handle anonymous functions that are not assigned to variables
                            localFunctions.set("Anonymous", path.node); // Assigning a default name
                        }
                    },
                });

                const imports: t.ImportDeclaration[] = [];

                path.traverse({
                    ImportDeclaration(importPath: NodePath<t.ImportDeclaration>) {
                        imports.push(importPath.node);
                    },
                });

                path.traverse({
                    VariableDeclarator(variablePath: NodePath<t.VariableDeclarator>) {
                        const varName = variablePath.node.id.name
                        localVariables.set(varName, variablePath)
                    }
                })

                // Map imported identifiers to their source modules
                path.traverse({
                    ImportDeclaration(importPath: NodePath<t.ImportDeclaration>) {
                        const source = importPath.node.source.value;
                        importPath.node.specifiers.forEach((specifier: t.Node) => {
                            if (t.isImportSpecifier(specifier)
                                || t.isImportDefaultSpecifier(specifier)) {
                                const importedName = specifier.local.name;
                                importMap.set(importedName, source);
                            }
                            console.log("LOCA", specifier.local.name, importMap, imports);
                        });
                    },
                });

                // Handle Function Declarations for importing required modules
                path.traverse({
                    Function(functionPath: NodePath<t.FunctionDeclaration | t.FunctionExpression | t.ArrowFunctionExpression>) {
                        if (t.isFunctionDeclaration(functionPath.node)) {
                            const body = functionPath.get("body") as NodePath<t.BlockStatement>;
                            const namedImports = new Set<t.VariableDeclaration>();
                            const specifierImports = new Set<t.VariableDeclaration>();

                            imports.forEach((importNode) => {
                                const source = importNode.source.value;
                                const specifiers = importNode.specifiers;
                                const requireCall = t.callExpression(t.identifier("require"), [t.stringLiteral(source)]);

                                if (specifiers.length === 1 && t.isImportDefaultSpecifier(specifiers[0])) {
                                    // Default import
                                    const defImport = t.variableDeclaration("const", [
                                        t.variableDeclarator(t.identifier(specifiers[0].local.name), requireCall),
                                    ]);

                                    body.unshiftContainer("body", defImport);
                                } else {
                                    // Named imports
                                    const modIdentifier = path.scope.generateUidIdentifier("mod").name;
                                    const sourceIter = source.split(".");

                                    if (sourceIter.length > 1) return;

                                    const nameImport = t.variableDeclaration("const", [
                                        t.variableDeclarator(t.identifier(modIdentifier), requireCall),
                                    ]);

                                    console.log("found mod", modIdentifier, source);

                                    namedImports.add(nameImport);
                                    specifiers.forEach((specifier: t.ImportSpecifier) => {
                                        console.log("MMO", modIdentifier,);
                                        const specifierNode = t.variableDeclaration("var", [
                                            t.variableDeclarator(
                                                t.identifier(specifier.imported ? specifier.imported.name : specifier.local.name),
                                                t.memberExpression(t.identifier(modIdentifier), t.identifier(specifier.local.name))
                                            ),
                                        ]);
                                        specifierImports.add(specifierNode);
                                        console.log("found specifier", specifier.local.name);
                                    });
                                }
                            });

                            // Insert specifier imports
                            specifierImports.forEach((importStatement) => {
                                if (t.isVariableDeclaration(importStatement)) {
                                    body.unshiftContainer("body", importStatement);
                                }
                            });

                            // Insert named imports
                            namedImports.forEach((modImport) => {
                                body.unshiftContainer("body", modImport);
                            });
                        }
                    },
                });


                // Handle specific CallExpressions like 'routerAdd'
                path.traverse({
                    CallExpression(callPath: NodePath<t.CallExpression>) {
                        if (t.isIdentifier(callPath.node.callee, { name: "routerAdd" })) {
                            // Assuming 'routerAdd' has at least three arguments
                            const args = callPath.get("arguments");
                            if (args.length >= 3) {
                                let functionArgPath = args[2];

                                // Convert to BlockStatement if it's not already
                                if (!t.isBlockStatement(functionArgPath.node.body)) {
                                    const returnStatement = t.returnStatement(functionArgPath.node.body);
                                    const blockStatement = t.blockStatement([returnStatement]);

                                    // Replace the concise body with a block statement
                                    functionArgPath.replaceWith(
                                        t.arrowFunctionExpression(
                                            functionArgPath.node.params,
                                            blockStatement
                                        )
                                    );

                                    // Update the path to the new block statement
                                    functionArgPath = functionArgPath.get("body");
                                } else {
                                    functionArgPath = functionArgPath.get("body");
                                }

                                // console.log("ARGUM", functionArgPath, functionArgPath.body[0].traverse)

                                const blockStatement = functionArgPath as NodePath<t.BlockStatement>;
                                const moduleImports = new Map<string, t.VariableDeclaration>();
                                const funcDeclarations = new Set<t.VariableDeclaration>();
                                const localFunctionsToInject = new Set<string>();

                                blockStatement.traverse({
                                    CallExpression(innerCallPath: NodePath<t.CallExpression>) {
                                        const calleeName = innerCallPath.node.callee.name;
                                        if (localFunctions.has(calleeName)) {
                                            localFunctionsToInject.add(calleeName);
                                        }

                                        // Check if the function is defined in the current scope
                                        const funcDef = innerCallPath.scope.getBinding(calleeName);
                                        if (funcDef && funcDef.path) {

                                            // Get the function path node to traverse and track calls
                                            const result = trackFunctionCalls(innerCallPath);

                                            // Track variable usages within the function
                                            const variablesUsage = trackVariableCalls(funcDef.path.node);
                                            const intersects = new Set<string>(
                                                [...variablesUsage].filter((name) => importMap.has(name))
                                            );

                                            console.log(
                                                "[func]",
                                                result,
                                                result.size,
                                                calleeName,
                                                result.get(calleeName),
                                                importMap,
                                                variablesUsage,
                                                intersects
                                            );

                                            const size = result.size;
                                            const unwrapped = result.get(calleeName);
                                            for (const intersect of intersects) {
                                                const modPath = importMap.get(intersect) || "";
                                                const modIter = modPath.split(".");
                                                const pathUtil = require("path")
                                                const baseMod = pathUtil.basename(modPath);

                                                const baseKey = `${modPath}${baseMod}`;
                                                const baseHashed = createHash("md5").update(baseKey).digest("hex");
                                                const base = baseHashed;

                                                console.log(
                                                    "[inter]",
                                                    intersect,
                                                    modPath,
                                                    modIter,
                                                    base,
                                                    moduleImports.has(base),
                                                    baseHashed
                                                );

                                                if (!moduleImports.has(base)) {
                                                    const inlined = createInlineImportStatement(base, modPath, cwd);
                                                    if (inlined) {
                                                        moduleImports.set(base, inlined);
                                                        const func = createFuncDeclaration(intersect, base);
                                                        const funcName = intersect;
                                                        if (!declaredFunctionNames.has(funcName)) {
                                                            funcDeclarations.add(func);
                                                            declaredFunctionNames.add(funcName);
                                                        }
                                                    }
                                                } else {
                                                    const func = createFuncDeclaration(intersect, base);
                                                    const funcName = intersect;
                                                    if (!declaredFunctionNames.has(funcName)) {
                                                        funcDeclarations.add(func);
                                                        declaredFunctionNames.add(funcName);
                                                    }
                                                }
                                            }

                                            console.log("UN", unwrapped, size)
                                            // i still don't know what the fk does this do?
                                            if (unwrapped && size > 0) {
                                                if (unwrapped instanceof Set) {
                                                    unwrapped.forEach((element) => {
                                                        const funcDef = localFunctions.get(element);
                                                        console.log("[ele]", element, funcDef);
                                                        if (funcDef) {
                                                            const rs = trackVariableCalls(funcDef);
                                                            console.log("[ele tracker]", rs, element, calleeName);
                                                        }

                                                        localFunctionsToInject.add(element);
                                                    });
                                                }
                                            }

                                        }
                                    },
                                });



                                localFunctionsToInject.forEach((funcName) => {
                                    const funcNode = localFunctions.get(funcName);
                                    if (funcNode) {
                                        blockStatement.unshiftContainer("body", funcNode);
                                    }

                                });

                                // Insert function declarations
                                funcDeclarations.forEach((declaration) => {
                                    blockStatement.unshiftContainer("body", declaration);
                                });


                                // Insert module imports
                                moduleImports.forEach((importStatement) => {
                                    blockStatement.unshiftContainer("body", importStatement);
                                });

                                // Insert variable inlining second because it takes precendence 
                                localVariables.forEach((variable) => {
                                    const varNode = variable.node
                                    const parentNode = variable.parent
                                    const reconstruct =
                                        t.variableDeclaration(parentNode.kind,
                                            [
                                                t.variableDeclarator(t.identifier(varNode.id.name), varNode.init),

                                            ]
                                        )
                                    blockStatement.unshiftContainer("body", reconstruct)
                                })

                                // Insert the requireStatement at the top
                                blockStatement.unshiftContainer("body", requireStatement);

                            }
                        }
                    },
                });
            },
        },
    };
}
