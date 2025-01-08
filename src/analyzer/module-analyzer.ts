import * as ts from 'typescript';
import * as fs from 'fs';
import * as path from 'path';
import { nodeBuiltInModules } from './constant';
import { AnalysisResult, DependencyDetail, TypeInjectMod } from './schema';

const DEBUG = false;
const SERVER_TYPE_INJECTION = '';

/**
 * Recursively reads all TypeScript files from the given directory.
 */
function readTypeScriptFiles(dir: string, filelist: string[] = []): string[] {
    const files = fs.readdirSync(dir);
    files.forEach((file) => {
        const filepath = path.join(dir, file);
        if (fs.statSync(filepath).isDirectory()) {
            readTypeScriptFiles(filepath, filelist);
        } else if (filepath.endsWith('.ts')) {
            filelist.push(filepath);
        }
    });
    return filelist;
}

// Function to get top comments
function getTopComments(sourceFile: ts.SourceFile, fileContent: string) {
    const comments: string[] = [];
    // Retrieve the leading comments on the first statement (assuming top of file)
    const firstStatement = sourceFile.statements[0];
    if (firstStatement) {
        const commentRanges = ts.getLeadingCommentRanges(fileContent, firstStatement.pos);

        if (commentRanges) {
            commentRanges.forEach((range) => {
                const comment = fileContent.substring(range.pos, range.end);
                comments.push(comment.trim());
            });
        }
    }
    return comments;
}

function scanPBTypeInjection(content: string): TypeInjectMod | null {
    const referenceDirectiveRegex = /\/\/\/\s*<reference\s+path="([^"]+)"\s*\/>/;
    const result = referenceDirectiveRegex.exec(content);
    if (result !== null) {
        return {
            text: result[0],
            path: result[1],
            pos: result.index,
        };
    }
    return null;
}

function replacePBTypeInjection(content: string, newPath: string) {
    const referenceDirectiveRegex = /\/\/\/\s*<reference\s+path="([^"]+)"\s*\/>/;
    return content.replace(referenceDirectiveRegex, (match, oldPath) => {
        return match.replace(oldPath, newPath);
    });
}


export function createTSSource(rawContent: string, tempFileName: string = "temp.ts") {
    const fileName = tempFileName;
    const sourceFile = ts.createSourceFile(
        fileName,
        rawContent,
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.TS
    );
    return { sourceFile, fileName }
}

function analyzeRawContent(rawContent: string): AnalysisResult {
    const { sourceFile, fileName } = createTSSource(rawContent)
    const com = getTopComments(sourceFile, rawContent);
    let found: TypeInjectMod | null;

    for (const comment of com) {
        const isInjected = scanPBTypeInjection(comment) as TypeInjectMod;
        if (isInjected) {
            found = isInjected;
            if (isInjected.path !== SERVER_TYPE_INJECTION) {
                const newCom = replacePBTypeInjection(comment, SERVER_TYPE_INJECTION);
                // Do something with newCom if needed
            }
            break;
        }
    }

    // Define compiler options with the necessary libraries
    const compilerOptions: ts.CompilerOptions = {
        lib: ['DOM'],
        types: ['node', 'jsdom'],
    };

    const compilerHost = ts.createCompilerHost(compilerOptions, true);
    const customCompilerHost = function(filename: string, sourceFile: ts.SourceFile) {
        return {
            getSourceFile: (name: string, languageVersion: ts.ScriptTarget) => {
                if (name === filename) {
                    return sourceFile;
                } else {
                    return compilerHost.getSourceFile(name, languageVersion);
                }
            },
            writeFile: (filename: string, data: string) => { },
            getDefaultLibFileName: () => 'lib.d.ts',
            useCaseSensitiveFileNames: () => false,
            getCanonicalFileName: (filename: string) => filename,
            getCurrentDirectory: () => '',
            getNewLine: () => '\n',
            getDirectories: () => [],
            fileExists: () => true,
            readFile: () => '',
        };
    };

    const program = ts.createProgram(
        [fileName],
        compilerOptions,
        customCompilerHost(fileName, sourceFile)
    );
    program.emit();

    const diagnostics = ts.getPreEmitDiagnostics(program, sourceFile);
    const cleanup = diagnostics.filter((diagnostic) => diagnostic.length).map(diagnostic => diagnostic.messageText);
    console.log("CLEAN", cleanup)

    // Analyze the source file and collect results
    const routerDependencies = analyzeRouterDependencies(sourceFile);
    return routerDependencies

}

export function fetchFullDependencies(sourceFile: ts.SourceFile) {

    const imports = collectImports(sourceFile).map((detail) => ({ ...detail, kind: "import" }));
    const requires = collectRequires(sourceFile).map(detail => ({ ...detail, kind: "require" }))

    return {
        dependencies: imports.concat(requires)
    }
}

/**
 * Analyzes a source file to find and process `routerAdd` calls.
 */
function analyzeRouterDependencies(sourceFile: ts.SourceFile): AnalysisResult {
    const imports = collectImports(sourceFile);
    const requires = collectRequires(sourceFile)

    const dependencies: DependencyDetail[] = [];
    const statusCodesSet = new Set<number>();
    let usesNodeApis = false;

    // isssue this only detect if there is a routerAdd call
    function visit(node: ts.Node) {
        if (ts.isCallExpression(node)) {
            if (isRouterAddCall(node)) {
                processRouterAddCall(node, imports, sourceFile, dependencies, statusCodesSet);
                processRouterAddCall(node, requires, sourceFile, dependencies, statusCodesSet);
            }
        }
        ts.forEachChild(node, visit);
    }

    visit(sourceFile);

    // Check if any of the imports are Node.js built-in modules
    for (const imp of imports) {
        if (nodeBuiltInModules.includes(imp.moduleName)) {
            usesNodeApis = true;
            break;
        }
    }

    // Check if any of the imports are Node.js built-in modules
    for (const req of requires) {
        if (nodeBuiltInModules.includes(req.moduleName)) {
            usesNodeApis = true;
            break;
        }
    }

    return {
        dependencies,
        statusCodes: Array.from(statusCodesSet),
        usesNodeApis,
    };
}

/**
 * Checks if a call expression is a `routerAdd` call.
 */
function isRouterAddCall(node: ts.CallExpression): boolean {
    const { expression } = node;
    return (
        (ts.isIdentifier(expression) && expression.text === 'routerAdd') ||
        (ts.isPropertyAccessExpression(expression) && expression.name.text === 'routerAdd')
    );
}


/**
 * Collects all require statements in the source file.
 */
export function collectRequires(sourceFile: ts.SourceFile): ImportDetail[] {
    const imports: ImportDetail[] = [];
    sourceFile.forEachChild((node) => {
        // Look for variable declarations with require calls
        if (
            ts.isVariableStatement(node) &&
            node.declarationList.declarations.length > 0
        ) {
            node.declarationList.declarations.forEach((declaration) => {
                if (
                    declaration.initializer &&
                    ts.isCallExpression(declaration.initializer) &&
                    ts.isIdentifier(declaration.initializer.expression) &&
                    declaration.initializer.expression.text === 'require' &&
                    declaration.initializer.arguments.length === 1 &&
                    ts.isStringLiteral(declaration.initializer.arguments[0])
                ) {
                    const moduleName = declaration.initializer.arguments[0].text;
                    const importSpecifiers: string[] = [];

                    // Collect specifiers based on the variable structure
                    if (ts.isIdentifier(declaration.name)) {
                        // Single variable import
                        importSpecifiers.push(declaration.name.text);
                    } else if (ts.isObjectBindingPattern(declaration.name)) {
                        // Destructured imports
                        declaration.name.elements.forEach((element) => {
                            if (ts.isBindingElement(element) && ts.isIdentifier(element.name)) {
                                importSpecifiers.push(element.name.text);
                            }
                        });
                    }

                    const isInternal = moduleName.startsWith('.') || moduleName.startsWith('/');

                    imports.push({
                        moduleName,
                        specifiers: importSpecifiers,
                        type: isInternal ? 'Internal' : 'External',
                    });
                }
            });
        }
    });

    return imports;
}

/**
 * Collects all import declarations in the source file.
 */
export function collectImports(sourceFile: ts.SourceFile): ImportDetail[] {
    const imports: ImportDetail[] = [];

    sourceFile.forEachChild((node) => {
        if (
            ts.isImportDeclaration(node) &&
            node.moduleSpecifier &&
            ts.isStringLiteral(node.moduleSpecifier)
        ) {
            const moduleName = node.moduleSpecifier.text;
            const importSpecifiers: string[] = [];

            if (node.importClause) {
                const { name, namedBindings } = node.importClause;

                if (name) {
                    // Default import
                    importSpecifiers.push(name.text);
                }

                if (namedBindings) {
                    if (ts.isNamedImports(namedBindings)) {
                        // Named imports
                        namedBindings.elements.forEach((element) => {
                            importSpecifiers.push(element.name.text);
                        });
                    } else if (ts.isNamespaceImport(namedBindings)) {
                        // Namespace import
                        importSpecifiers.push(namedBindings.name.text);
                    }
                }
            }

            const isInternal = moduleName.startsWith('.') || moduleName.startsWith('/');

            imports.push({
                moduleName,
                specifiers: importSpecifiers,
                type: isInternal ? 'Internal' : 'External',
            });
        }
    });

    return imports;
}

interface ImportDetail {
    moduleName: string;
    specifiers: string[];
    type: 'Internal' | 'External';
}

/**
 * Processes a `routerAdd` call to extract method, pathname, dependencies, and status codes.
 */
function processRouterAddCall(
    node: ts.CallExpression,
    imports: ImportDetail[],
    sourceFile: ts.SourceFile,
    dependencies: DependencyDetail[],
    statusCodesSet: Set<number>
) {
    const args = node.arguments;
    if (args.length < 3) return;

    const [methodArg, pathnameArg, handlerArg] = args;
    const methodName = getStringLiteralValue(methodArg);
    const pathname = getStringLiteralValue(pathnameArg);

    if (
        methodName &&
        pathname &&
        (ts.isFunctionExpression(handlerArg) || ts.isArrowFunction(handlerArg))
    ) {
        if (DEBUG)
            console.log(`Found routerAdd:\n  Method: ${methodName}\n  Path: ${pathname}`);
        analyzeHandlerFunction(handlerArg, imports, sourceFile, dependencies, statusCodesSet);
    }
}

/**
 * Retrieves the string value from a string literal node.
 */
function getStringLiteralValue(node: ts.Expression): string | null {
    return ts.isStringLiteral(node) ? node.text : null;
}

/**
 * Analyzes the handler function to list the imports (dependencies).
 */
function analyzeHandlerFunction(
    handler: ts.FunctionExpression | ts.ArrowFunction,
    imports: ImportDetail[],
    sourceFile: ts.SourceFile,
    dependencies: DependencyDetail[],
    statusCodesSet: Set<number>
) {
    // Collect dependency details
    const dependencyDetails = imports.map((imp) => ({
        module: imp.moduleName,
        specifiers: imp.specifiers,
        type: imp.type,
    }));

    dependencies.push(...dependencyDetails);

    // Analyze status codes within the handler function
    function visit(node: ts.Node) {
        if (ts.isCallExpression(node) && isCJsonCall(node)) {
            const statusCode = extractStatusCode(node.arguments[0]);
            if (statusCode !== null) {
                statusCodesSet.add(statusCode);
            }
        }
        ts.forEachChild(node, visit);
    }

    visit(handler);
}

/**
 * Checks if a call expression is `c.json(status, payload)`.
 */
function isCJsonCall(node: ts.CallExpression): boolean {
    const { expression } = node;
    return (
        ts.isPropertyAccessExpression(expression) &&
        expression.name.text === 'json' &&
        ts.isIdentifier(expression.expression) &&
        expression.expression.text === 'c'
    );
}

/**
 * Extracts the status code from the `c.json` call.
 */
function extractStatusCode(node: ts.Expression): number | null {
    if (ts.isNumericLiteral(node)) {
        return parseInt(node.text, 10);
    }
    return null;
}


// /// abck
// ///kasjdka
// /// <reference path="./types.d.ts" /> kasdjakd
// import * as fs from 'fs';
// import * as path from 'path';
// import jsjs from './local'
// const { external_import } = require("tooling")
// external_import("aksjd")


// console.log("HELLO");
// routerAdd("GET","/bin",(ctx) => {
//     c.json(200, { message: "OK" });
// });

// Example usage:
const sample = `
    // abck
    //kasjdka
    // <reference path="./types.d.ts" /> kasdjakd
    const { external_import } = require("tooling")
    const {
        external_import: import_export_import,
        internal_import: import_export_export
    } = require("../pb_hooks/import-export-tooling.js");
    import_export_import("index");

`;

// // Analyze the sample code and get the result
const result = analyzeRawContent(sample);
console.log('Analysis Result:', result);

export {
    analyzeRawContent,
    readTypeScriptFiles,
    analyzeRouterDependencies as analyzeSourceFile
}
