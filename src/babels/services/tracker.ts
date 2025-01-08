
import { NodePath, types as t } from "@babel/core";

export function trackFunctionCalls(path: NodePath<t.FunctionDeclaration | t.FunctionExpression | t.ArrowFunctionExpression>): Map<string, Set<string>> {
    const functionCalls = new Map<string, Set<string>>();
    path.traverse({
        CallExpression(callPath: NodePath<t.CallExpression>) {
            const callee = callPath.node.callee;
            const calleeName = callee.name;
            // Get the enclosing function's name
            const enclosingFunction = callPath.getFunctionParent();
            if (
                enclosingFunction &&
                (enclosingFunction.isFunctionDeclaration() ||
                    enclosingFunction.isFunctionExpression() ||
                    enclosingFunction.isArrowFunctionExpression())
            ) {
                const enclosingFunctionId = enclosingFunction.node.id
                const funcName = enclosingFunctionId ?
                    enclosingFunctionId.name :
                    enclosingFunction.parent.id.name

                if (!functionCalls.has(funcName)) {
                    functionCalls.set(funcName, new Set());
                }
                functionCalls.get(funcName)?.add(calleeName);
            }
        },
    });

    return functionCalls;
}


/**
 * Tracks variable calls within a given AST node.
 * @param node - The AST node to traverse.
 * @returns A set of variable names used.
 */
export function trackVariableCalls(node: t.Node): Set<string> {
    const variableUsage = new Map<string, Set<string>>();
    const declaredVariables = new Set<string>();
    const visitedNodes = new WeakSet<t.Node>(); // to track visited nodes by reference

    function traverseNode(node: t.Node) {
        if (!node || typeof node !== "object") return;
        if (visitedNodes.has(node)) return; // Already visited this node, skip
        visitedNodes.add(node);

        // Handle variable declarations
        if (t.isVariableDeclaration(node)) {
            for (const declaration of node.declarations || []) {
                if (declaration.id && t.isIdentifier(declaration.id)) {
                    declaredVariables.add(declaration.id.name);
                }
            }
        }

        // Handle identifiers
        if (t.isIdentifier(node)) {
            const variableName = node.name;
            if (!declaredVariables.has(variableName)) {
                if (!variableUsage.has(variableName)) {
                    variableUsage.set(variableName, new Set());
                }
                variableUsage.get(variableName)?.add(variableName);
            }
        }

        // Recursively traverse known AST properties
        // Instead of iterating over all keys blindly, focus on known child properties.
        for (const key in node) {
            if (Object.prototype.hasOwnProperty.call(node, key)) {
                const value = (node as any)[key];
                if (Array.isArray(value)) {
                    value.forEach((childNode: t.Node) => traverseNode(childNode));
                } else if (value && typeof value === "object" && "type" in value) {
                    traverseNode(value as t.Node);
                }
            }
        }
    }

    traverseNode(node);

    const normalizedSet = new Set(variableUsage.keys());
    return normalizedSet;
}



/**
 * Checks if a node is a require call and extracts its details.
 * @param node - The Babel AST node to inspect.
 * @returns An object containing module details if it's a require call, otherwise null.
 */
export function isRequireCallBabel(node: t.Node): { moduleName: string; } | null {
    if (
        t.isCallExpression(node) &&
        t.isIdentifier(node.callee, { name: 'require' }) &&
        node.arguments.length === 1 &&
        t.isStringLiteral(node.arguments[0])
    ) {
        const moduleName = node.arguments[0].value;
        return { moduleName };
    }
    return null;
}



