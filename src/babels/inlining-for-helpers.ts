import { NodePath, types as t } from "@babel/core"

// babel-plugin-transform-for-const-to-traditional-for.js
export default function({ types: t }) {
    return {
        name: "transform-for-const-to-traditional-for",
        visitor: {
            ForOfStatement(path: NodePath) {
                const { node, scope } = path;
                const { left, right, body, await: isAwait } = node;

                // Ensure the left side is a VariableDeclaration with kind 'const' or 'let'
                if (
                    t.isVariableDeclaration(left) &&
                    (left.kind === "const" || left.kind === "let") &&
                    left.declarations.length === 1
                ) {

                    const declarator = left.declarations[0];

                    // Ensure the declarator has an identifier
                    if (t.isIdentifier(declarator.id)) {
                        const varName = declarator.id.name;
                        const iterable = right;

                        // Generate a unique identifier for the index variable
                        const indexIdentifier = scope.generateUidIdentifier("i");

                        // Create the initializer: let i = 0;
                        const declareStatement = t.variableDeclaration("let", [
                            t.variableDeclarator(indexIdentifier, t.numericLiteral(0)),
                        ]);

                        const testStatement = t.binaryExpression(
                            "<",
                            indexIdentifier,
                            t.memberExpression(iterable, t.identifier("length"))
                        );
                        const updateIterStatement = t.updateExpression("++", indexIdentifier);

                        // Create the variable declaration inside the loop: const item = iterable[i];
                        const itemDeclaration = t.variableDeclaration(left.kind, [
                            t.variableDeclarator(
                                t.identifier(varName),
                                t.memberExpression(iterable, indexIdentifier, true)
                            ),
                        ]);

                        // Ensure the loop body is a block statement
                        let iterationBody: t.Node;
                        if (t.isBlockStatement(body)) {
                            iterationBody = t.blockStatement([
                                itemDeclaration,
                                ...body.body,
                            ]);
                        } else {
                            iterationBody = t.blockStatement([
                                itemDeclaration,
                                body,
                            ]);
                        }

                        // Create the new ForStatement node
                        const forStatement = t.forStatement(
                            declareStatement,
                            testStatement,
                            updateIterStatement,
                            iterationBody
                        );

                        // Preserve comments and replace the original ForOfStatement
                        path.replaceWith(forStatement);
                    }
                }
            },
        },
    };
};
