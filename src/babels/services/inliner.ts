import { extractTSModule, processPath } from "../utils";
import { types as t } from "@babel/core";

/**
 * Creates an inline import statement using external_import
 * @param inlineVariable - The variable name for the import.
 * @param importPath - The path to import.
 * @param cwd - Current working directory.
 * @returns A variable declaration node or undefined.
 */
export const createInlineImportStatement = (
    inlineVariable: string,
    importPath: string,
    cwd: string
): t.VariableDeclaration | undefined => {
    const processed = processPath(importPath, cwd);
    const { modulePath: packPath, mod } = extractTSModule(importPath);
    const args: t.Expression[] = [t.stringLiteral(mod)];

    if (packPath || packPath !== "") {
        args.push(t.stringLiteral(packPath));
    }
    if (processed.external) {
        return;
    }
    if (processed.changed) {
        args.push(t.stringLiteral(processed.path));
    }

    return t.variableDeclaration("const", [
        t.variableDeclarator(t.identifier(`${inlineVariable}`), t.callExpression(t.identifier("external_import"), args)),
    ]);
};


/**
 * Creates a function declaration from a module.
 * @param funcName - The function name.
 * @param mod - The module name.
 * @returns A variable declaration node.
 */
export const createFuncDeclaration = (funcName: string, mod: string): t.VariableDeclaration => {
    return t.variableDeclaration("const", [
        t.variableDeclarator(t.identifier(funcName), t.memberExpression(t.identifier(mod), t.identifier(funcName))),
    ]);
};
