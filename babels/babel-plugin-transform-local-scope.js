const { randomUUID } = require("crypto");
const { getToolingPath, TOOLING_DIR, TOOLING_FILE_NAME } = require("../helpers/utils");
const path = require("path");

module.exports = function({ types: t }) {
    const InsertionMap = new Map();
    // Construct the require statement with a template literal
    const toolingEndpoint = path.join("/", TOOLING_FILE_NAME)
    const requireStatement = t.variableDeclaration("const", [
        t.variableDeclarator(
            t.objectPattern([
                t.objectProperty(t.identifier("local_import"), t.identifier("local_import")),
                t.objectProperty(t.identifier("external_import"), t.identifier("external_import")),
            ]),
            t.callExpression(t.identifier("require"), [
                t.templateLiteral(
                    [
                        t.templateElement({ raw: '', cooked: '' }, false),
                        t.templateElement({ raw: toolingEndpoint, cooked: toolingEndpoint }, true)
                    ],
                    [t.identifier('__hooks')]
                )
            ])
        ),
    ]);

    const createImportStatement = (mod) => t.variableDeclaration("const", [
        t.variableDeclarator(
            t.identifier(mod),
            t.callExpression(
                t.identifier("external_import"),
                [t.stringLiteral(mod)]
            )
        )
    ]);

    const createFuncDeclaration = (funcName, mod) => {
        return t.variableDeclaration("const", [
            t.variableDeclarator(
                t.identifier(funcName),
                t.memberExpression(
                    t.identifier(mod),
                    t.identifier(funcName)
                )
            )
        ]);
    };

    return {
        visitor: {
            Program(path) {
                const importMap = new Map();
                const localFunctions = new Map();
                const localFunctionsMarkedDeleted = new Map();

                // Find all local function declarations
                path.traverse({
                    FunctionDeclaration(path) {
                        const funcName = path.node.id.name
                        localFunctions.set(funcName, path.node);
                    }
                });

                const imports = [];
                path.traverse({
                    ImportDeclaration(importPath) {
                        imports.push(importPath.node);
                        // importPath.remove();
                    }
                });

                path.traverse({
                    ImportDeclaration(importPath) {
                        const source = importPath.node.source.value;
                        importPath.node.specifiers.forEach((specifier) => {
                            console.log("LOCA", specifier.local.name, source)
                            if (t.isImportSpecifier(specifier)
                                || t.isImportDefaultSpecifier(specifier)) {
                                const importedName = specifier.local.name;
                                importMap.set(importedName, source);
                            }
                        });
                    },
                });


                path.traverse({
                    Function(functionPath) {
                        if (functionPath.node.type === "FunctionDeclaration") {
                            const body = functionPath.get("body");
                            const namedImports = new Set();
                            const defaultImports = new Set();
                            const specImports = new Set();
                            const modImports = new Set();

                            imports.forEach(importNode => {
                                const source = importNode.source.value;
                                console.log("SS", source)
                                const specifiers = importNode.specifiers;

                                const requireCall = t.callExpression(
                                    t.identifier("require"),
                                    [t.stringLiteral(source)]
                                );

                                if (specifiers.length === 1 && specifiers[0].type === "ImportDefaultSpecifier") {
                                    // Default import
                                    const defImport =
                                        t.variableDeclaration("const", [
                                            t.variableDeclarator(
                                                t.identifier(specifiers[0].local.name),
                                                requireCall
                                            )
                                        ])

                                    console.log("found defualt", defImport) // body.unshiftContainer("body",
                                    // );
                                } else {
                                    // Named imports
                                    const modIdentifier = path.scope.generateUidIdentifier("mod");
                                    const spl = source.split(".")

                                    // we stop right here because we know that it is a local import
                                    if (spl.length > 1) return
                                    const nameImport =
                                        t.variableDeclaration("const", [
                                            t.variableDeclarator(
                                                modIdentifier,
                                                requireCall
                                            )
                                        ])

                                    console.log("found mod", modIdentifier, source)

                                    namedImports.add(nameImport)
                                    specifiers.forEach(specifier => {
                                        console.log("MMO", modIdentifier)
                                        const specifierImport = createFuncDeclaration(specifier.local.name, modIdentifier.name)
                                        const ppx = t.variableDeclaration("var", [
                                            t.variableDeclarator(
                                                t.identifier(specifier.imported.name),
                                                t.memberExpression(
                                                    modIdentifier,
                                                    t.identifier(specifier.local.name)
                                                )
                                            )
                                        ])
                                        specImports.add(ppx)
                                        console.log("found specifier", specifier.local.name)

                                    });
                                }

                            });

                            specImports.forEach((importStatement) => {
                                body.unshiftContainer('body', importStatement);
                            })

                            namedImports.forEach((modImport) => {
                                body.unshiftContainer('body', modImport);
                            })
                        }
                    }
                });

                // path.traverse({
                //     Function(functionPath) {
                //         if (functionPath.node.type === "FunctionDeclaration") {

                //         }
                //     }
                // })

                path.traverse({
                    CallExpression(callPath) {
                        if (t.isIdentifier(callPath.node.callee, { name: "routerAdd" })) {
                            // this particular file
                            const secondArg = callPath.get("arguments")[2];
                            const blockStatement = secondArg.get("body");
                            let localPathImport = false
                            if (blockStatement.isBlockStatement()) {
                                const moduleImports = new Map();
                                const funcDeclarations = new Set();
                                const injectedFunctions = new Set();
                                const localFunctionsToInject = new Set();

                                blockStatement.traverse({
                                    CallExpression(innerCallPath) {
                                        const calleeName = innerCallPath.node.callee.name;

                                        if (localFunctions.has(calleeName)) {
                                            localFunctionsToInject.add(calleeName);
                                        }

                                        importMap.forEach((source, libImport) => {
                                            if (t.isIdentifier(innerCallPath.node.callee, { name: libImport })
                                                && !injectedFunctions.has(libImport)) {

                                                const spl = source.split("/");
                                                console.log("Found function call:", libImport, spl);

                                                if (spl.length <= 1) {
                                                    localPathImport = true
                                                }

                                                const modName = spl[spl.length - 1];
                                                if (!moduleImports.has(modName)) {
                                                    moduleImports.set(modName, createImportStatement(modName));
                                                }

                                                funcDeclarations.add(createFuncDeclaration(libImport, modName));
                                                injectedFunctions.add(libImport);
                                            }
                                        });
                                    }
                                });

                                if (localPathImport) {
                                    localFunctionsToInject.forEach(funcName => {
                                        console.log("DUP", funcName)
                                    })
                                } else {
                                    // Insert local functions if they're called
                                    localFunctionsToInject.forEach(funcName => {
                                        if (localFunctions.has(funcName)) {
                                            blockStatement.unshiftContainer('body', localFunctions.get(funcName));
                                        }
                                    });

                                    // Insert function declarations
                                    funcDeclarations.forEach(declaration => {
                                        blockStatement.unshiftContainer('body', declaration);
                                    });

                                    // Insert module imports
                                    moduleImports.forEach((importStatement) => {
                                        blockStatement.unshiftContainer('body', importStatement);
                                    });

                                    // Insert the requireStatement at the top
                                    blockStatement.unshiftContainer('body', requireStatement);
                                }
                            }
                        } else {
                            // console.log("PROTO", callPath.node.callee.name)
                        }



                    },
                });

            },
        },
    };
};
