
import fs from 'fs';
import path from 'path';
import * as utils from "./utils";
import * as t from '@babel/types';
import { fetchFullDependencies, createTSSource } from '../analyzer/module-analyzer';
import generate from '@babel/generator';

// Load configuration
const config = utils.config;
const excludeModules: Set<string> = new Set(config.excludeModules || []);
const pbHooksPath: string = config.destination || './pb_hooks';
const compileOutput: string = config.compileOutputName;

// Collect all modules in pb_hooks directory
const targetDir: string = path.resolve(pbHooksPath);
const moduleDir: string = path.resolve(pbHooksPath + compileOutput);


/**
 * Creates an AST node for destructuring imports with `require`.
 * @param customExtImportIdentifier - The variable name for the external import.
 * @param customIntImportIdentifier - The variable name for the internal import.
 * @param param - The module name for the require statement.
 * @returns The AST node.
 */
function createRequireAstNode(
    customExtImportIdentifier: string,
    customIntImportIdentifier: string,
    param: string
): t.VariableDeclaration {
    return t.variableDeclaration('const', [
        t.variableDeclarator(
            t.objectPattern([
                t.objectProperty(
                    t.identifier('external_import'),
                    t.identifier(customExtImportIdentifier),
                    false,
                    true
                ),
                t.objectProperty(
                    t.identifier('internal_import'),
                    t.identifier(customIntImportIdentifier),
                    false,
                    true
                ),
            ]),
            t.callExpression(t.identifier('require'), [t.stringLiteral(param)])
        ),
    ]);
}

/**
 * Creates an AST node for a function call like `${importIdentifier}(param)`.
 * @param importIdentifier - The name of the function to call.
 * @param param - The argument to pass to the function.
 * @returns The AST node.
 */
function createFunctionCallAstNode(
    importIdentifier: string,
    param: string
): t.ExpressionStatement {
    return t.expressionStatement(
        t.callExpression(
            t.identifier(importIdentifier),
            [t.stringLiteral(param)]
        )
    );
}


function injectToolingToEntry() {

    const isTargetExist = fs.existsSync(targetDir)
    if (!isTargetExist)
        throw new Error("Injection target is not available.")

    const moduleFiles: string[] = fs.readdirSync(moduleDir)
        .filter(file => file.endsWith('.js') || file.endsWith('.ts'))
        .map(file => path.basename(file, path.extname(file)));

    const entryPath: string = config["entryPoint"];
    const entryPointContent: Buffer = fs.readFileSync(utils.getEntryFile());

    const hasEntry: boolean = moduleFiles.some(
        basePath => basePath === path.basename(entryPath, path.extname(entryPath))
    );

    const toolingPath: string = utils.getToolingPath();
    const normOutput: string = config["compileOutputName"].replace("-", "_");

    const external_identifier: string = `${normOutput}_import`;
    const internal_identifier: string = `${normOutput}_export`;

    const node: t.VariableDeclaration = createRequireAstNode(
        external_identifier,
        internal_identifier,
        toolingPath
    );

    const callingNode: t.ExpressionStatement = createFunctionCallAstNode(
        external_identifier,
        "index"
    );

    const initProgram: t.Program = t.program([node, callingNode]);

    const source = createTSSource(entryPointContent.toString());
    const result = fetchFullDependencies(source.sourceFile);

    const toolingPathExisted: boolean = result.dependencies.some(
        dependency => dependency.moduleName === toolingPath
    );

    if (toolingPathExisted) {
        return
    }

    console.log("ROS", result, entryPointContent.toString(), toolingPathExisted);

    let injectionCode: string = generate(initProgram, {}, '').code;

    if (!hasEntry) {
        throw new Error("Missing file entry point.");
    }

    console.log("I", injectionCode, moduleFiles, utils.getEntryFile(), result);

    let generatedStatement: string = "";

    generatedStatement += "// Generated content!!! Do not Modify!";
    generatedStatement += "\n";

    injectionCode = `${generatedStatement} ${injectionCode}`;

    fs.appendFileSync(utils.getEntryFile(), injectionCode);
}

