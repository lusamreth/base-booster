// src/index.ts

import { PluginObj, NodePath, PluginPass, types as t, Program, CallExpression } from "@babel/core";
import * as fs from "fs";
import * as crypto from "crypto";
import { generateSplitFile, getOutputPath, getSourceDir } from "../helpers/utils"
import * as pathUtils from "path";
import { joinPathsAtIntersectionWithSuffix } from "./helpers/path-combinator";
import { getMapping } from "../state/split-tracker";



const makeMetaStore = () => {

    const _store = {
        statements: {
            keep: [],
            extract: []
        }
    }

    const keepElement = (element: t.Node) => _store.statements.keep.push(element)
    const extractElement = (element: t.Node) => _store.statements.extract.push(element)
    const resetStore = () => _store.statements = { keep: [], extract: [] }

    return { keepElement, extractElement, resetStore, store: _store }
}

/**
 * The main Babel plugin.
 * @param param0 - An object containing Babel types.
 * @returns A Babel Plugin Object.
 */
const extractTopLevelPlugin = function({ types: t }: { types: any }): PluginObj {

    const { keepElement, extractElement, resetStore, store } = makeMetaStore()
    const fileTracker = {}
    return {
        name: "extract-top-level",
        visitor: {
            Program: {
                enter(path: NodePath<Program>, state: PluginPass) {
                    state.processed = false;

                    const body = path.node.body;
                    const currentFile = state.file.opts.filename;
                    const pathUtils = require("path")
                    const cwd = pathUtils.dirname(currentFile)

                    fileTracker["file"] = currentFile
                    fileTracker["cwd"] = cwd

                    console.log("cfile", currentFile, cwd, body.length);

                    const containRouterAdd = body.some((node: t.Node) =>
                        t.isExpressionStatement(node) &&
                        t.isIdentifier(node.expression.callee, { name: 'routerAdd' })
                    )

                    if (currentFile.endsWith('.extracted.js')) {
                        path.skip();
                    }
                    if (!containRouterAdd) return

                    body.forEach(node => {
                        if (
                            !(
                                t.isExpressionStatement(node) &&
                                t.isCallExpression(node.expression) &&
                                t.isIdentifier(node.expression.callee, { name: 'routerAdd' })
                            ) &&
                            !(
                                (

                                    node.type === "ExportDefaultDeclaration" ||
                                    node.type === "ExportNamedDeclaration"
                                )
                            )
                        ) {
                            extractElement(node);
                        } else {
                            keepElement(node);
                        }
                    });

                },
                exit(path: NodePath<Program>, state: PluginPass) {

                    const toExtract: t.Statement[] = store.statements.extract;
                    const toKeep: t.Statement[] = store.statements.keep;

                    if (toExtract.length === 0) return

                    const pathUtils = require("path")
                    const currentFile = state.file.opts.filename;
                    // fix this
                    const { splitFile: uniqueId } = getMapping(currentFile);
                    // const root = "/home/lusamreth/developments/pocketbase_extender_project/base-booster-toolchains/testings/src"

                    const root = getSourceDir()
                    const outputDir = joinPathsAtIntersectionWithSuffix(fileTracker["cwd"], getOutputPath(), root)
                    const outputPath = pathUtils.resolve(outputDir, uniqueId);

                    // console.log("target",
                    //     fileTracker["cwd"],
                    //     "output",
                    //     outputDir,
                    //     outputPath,
                    //     "root",
                    //     getOutputPath()
                    // )

                    // Ensure the output directory exists
                    if (!fs.existsSync(outputDir)) {
                        fs.mkdirSync(outputDir, { recursive: true });
                    }

                    // Collect exported identifiers
                    const exportedIdentifiers: string[] = [];
                    const bodyToExport: t.Statement[] = toExtract.map(node => {
                        if (t.isFunctionDeclaration(node) && node.id) {
                            exportedIdentifiers.push(node.id.name);
                        } else if (t.isVariableDeclaration(node)) {
                            node.declarations.forEach(decl => {
                                if (t.isIdentifier(decl.id)) {
                                    exportedIdentifiers.push(decl.id.name);
                                }
                            });
                        }
                        return node;
                    });

                    // Create module.exports statement
                    const exportProperties = exportedIdentifiers.map(id =>
                        t.objectProperty(t.identifier(id), t.identifier(id), false, true)
                    );

                    const exportStatement = t.expressionStatement(
                        t.assignmentExpression(
                            '=',
                            t.memberExpression(t.identifier('module'), t.identifier('exports')),
                            t.objectExpression(exportProperties)
                        )
                    );

                    // Generate the new AST for the extracted file
                    const extractedAst = t.file(
                        t.program([...bodyToExport, exportStatement])
                    );

                    const { code } = require('@babel/core').transformFromAstSync(extractedAst, null, {
                        presets: [
                            ['@babel/preset-env', { modules: false }] // Avoid CommonJS transformations
                        ],
                        ast: false, // Do not return the AST
                        code: true, // Ensure the generated code is returned
                    }) || { code: '' };

                    fs.writeFileSync(outputPath, code, 'utf8');

                    // Create the object pattern for destructuring the required module
                    const requireObjectPattern = t.objectPattern(
                        exportedIdentifiers.map(id => t.objectProperty(t.identifier(id), t.identifier(id), false, true))
                    );

                    // Create the require call expression
                    const requireCallExpression = t.callExpression(
                        t.identifier("require"),
                        [t.stringLiteral(`./${uniqueId}`)]
                    );

                    // Create the variable declaration for destructuring require
                    const requireDeclaration = t.variableDeclaration("const", [
                        t.variableDeclarator(requireObjectPattern, requireCallExpression),
                    ]);

                    // completely replace
                    path.node.body = [requireDeclaration, ...toKeep]
                    resetStore()
                }
            }
        }
    }
};

export default extractTopLevelPlugin;
