import { PluginObj, PluginPass } from "@babel/core";
import { NodePath, Visitor } from "@babel/traverse";
import _typeof from "@babel/runtime/helpers/typeof";
import * as t from "@babel/types";
import * as helpers from "@babel/helpers";

// Define the plugin
const injectHelpersPlugin = (opts): PluginObj<PluginPass> => {
    return {
        name: "inject-helpers",
        visitor: {
            // Handle all types of functions
            FunctionDeclaration(path: NodePath) {
                handleFunction(path, t);
            },
            FunctionExpression(path: NodePath) {
                handleFunction(path, t);
            },
            ArrowFunctionExpression(path: NodePath) {
                handleFunction(path, t);
            },
        },
    };
};

export default injectHelpersPlugin;

// Function to handle each function node
function handleFunction(
    path: NodePath<t.Function>,
    t: typeof import("@babel/types")
) {
    // Flags to determine if helpers are needed
    let needsObjectSpread = false;
    let needsTypeof = false;

    // Traverse the function body to detect required operations
    path.traverse({
        ObjectExpression(objPath: NodePath<t.ObjectExpression>) {
            objPath.node.properties.forEach((prop) => {
                if (t.isSpreadElement(prop)) {
                    needsObjectSpread = true;
                    // Do not stop traversal to detect other operations
                }
            });
        },
        UnaryExpression(unaryPath: NodePath<t.UnaryExpression>) {
            if (unaryPath.node.operator === "typeof") {
                needsTypeof = true;
            }
        },
    });

    // Inject helpers based on detected operations
    if (needsObjectSpread && !hasHelper(path, t, "_ObjectSpread")) {
        injectHelper(
            path,
            t,
            "_ObjectSpread",
            createObjectSpreadHelper(t)
        );
    }

    if (needsTypeof && !hasHelper(path, t, "_typeof")) {
        const importer = helpers.get("typeof")
        injectHelper(path, t, "_typeof", importer.nodes[0])
    }

    // Replace operations with helper calls
    if (needsObjectSpread || needsTypeof) {
        path.traverse({
            ObjectExpression(objPath: NodePath<t.ObjectExpression>) {
                const properties = objPath.node.properties;
                const spreadElements = properties.filter((prop: t.Node) =>
                    t.isSpreadElement(prop)
                ) as t.SpreadElement[];
                const regularProps = properties.filter(
                    (prop: t.Node) => !t.isSpreadElement(prop)
                ) as t.ObjectProperty[];

                if (spreadElements.length === 0) return; // No spread, no transformation needed

                // Start with an empty object
                let newExpression: t.CallExpression = t.callExpression(
                    t.identifier("_ObjectSpread"),
                    [t.objectExpression([]), spreadElements[0].argument]
                );

                // Sequentially apply remaining spreads
                for (let i = 1; i < spreadElements.length; i++) {
                    newExpression = t.callExpression(t.identifier("_ObjectSpread"), [
                        newExpression,
                        spreadElements[i].argument,
                    ]);
                }

                // Apply regular properties
                if (regularProps.length > 0) {
                    newExpression = t.callExpression(t.identifier("_ObjectSpread"), [
                        newExpression,
                        t.objectExpression(regularProps),
                    ]);
                }

                objPath.replaceWith(newExpression);
            },
            UnaryExpression(unaryPath: NodePath<t.UnaryExpression>) {
                const funcPath = unaryPath.getFunctionParent();
                const funcName = funcPath?.node.id?.name || 'anonymous';
                // avoid overiding fr fr
                if (funcName === "_typeof") {
                    return
                }

                if (unaryPath.node.operator === "typeof") {
                    unaryPath.replaceWith(
                        t.callExpression(t.identifier("_typeof"), [
                            unaryPath.node.argument,
                        ])
                    );
                }
            },
        });
    }
}

// Function to check if helper is already present
function hasHelper(
    path: NodePath<any>,
    t: typeof import("@babel/types"),
    helperName: string
): boolean {
    const binding = path.scope.getBinding(helperName);
    return !!binding;
}

// Function to inject helper if needed
function injectHelper(
    path: NodePath<any>,
    t: typeof import("@babel/types"),
    helperName: string,
    helperAst: t.Statement | t.Statement[]
) {
    const binding = path.scope.getBinding(helperName);
    if (!binding) {
        if (Array.isArray(helperAst)) {
            // If helperAst is an array of statements, inject all
            path.get("body").unshiftContainer("body", helperAst);
        } else {
            // If helperAst is a single statement, inject it
            path.get("body").unshiftContainer("body", helperAst);
        }
    }
}

// Function to create the _ObjectSpread helper AST node
function createObjectSpreadHelper(t: typeof import("@babel/types")): t.Statement {
    return t.variableDeclaration("const", [
        t.variableDeclarator(
            t.identifier("_ObjectSpread"),
            t.arrowFunctionExpression(
                [
                    t.identifier("target"),
                    t.restElement(t.identifier("sources")),
                ],
                t.blockStatement([
                    t.expressionStatement(
                        t.callExpression(
                            t.memberExpression(
                                t.identifier("sources"),
                                t.identifier("forEach")
                            ),
                            [
                                t.arrowFunctionExpression(
                                    [t.identifier("source")],
                                    t.blockStatement([
                                        t.ifStatement(
                                            t.identifier("source"),
                                            t.blockStatement([
                                                t.expressionStatement(
                                                    t.callExpression(
                                                        t.memberExpression(
                                                            t.callExpression(
                                                                t.memberExpression(
                                                                    t.identifier("Object"),
                                                                    t.identifier("keys")
                                                                ),
                                                                [t.identifier("source")]
                                                            ),
                                                            t.identifier("forEach")
                                                        ),
                                                        [
                                                            t.arrowFunctionExpression(
                                                                [t.identifier("key")],
                                                                t.blockStatement([
                                                                    t.expressionStatement(
                                                                        t.assignmentExpression(
                                                                            "=",
                                                                            t.memberExpression(
                                                                                t.identifier("target"),
                                                                                t.identifier("key"),
                                                                                true // computed: true
                                                                            ),
                                                                            t.memberExpression(
                                                                                t.identifier("source"),
                                                                                t.identifier("key"),
                                                                                true // computed: true
                                                                            )
                                                                        )
                                                                    ),
                                                                ])
                                                            ),
                                                        ]
                                                    )
                                                ),
                                            ])
                                        ),
                                    ])
                                ),
                            ]
                        )
                    ),
                    t.returnStatement(t.identifier("target")),
                ])
            )
        ),
    ]);
}

function importRuntimeHelper(t: typeof import("@babel/types"), helperId: string, runtimeName: string): t.Statement {

    const importedIdentifier = t.identifier(helperId);
    const importDefaultSpecifier = t.importDefaultSpecifier(importedIdentifier);
    const sourceLiteral = t.stringLiteral(`@babel/runtime/helpers/${runtimeName}`);
    const importDeclaration = t.importDeclaration(
        [importDefaultSpecifier],// 
        sourceLiteral
    );

    return importDeclaration
}

