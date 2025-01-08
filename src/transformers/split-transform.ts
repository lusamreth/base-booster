import { generateSplitFile, identifySplitFile } from "../helpers/utils";
import { getMapping, trackFile } from "../state/split-tracker";
import ts from "typescript";

export function createTrackingTransformer(): ts.TransformerFactory<ts.SourceFile> {
    return (_context) => {

        return (sourceFile) => {

            let hasRouter = false


            function visit(node: ts.Node) {
                if (ts.isCallExpression(node)) {
                    if (
                        !hasRouter &&
                        ts.isIdentifier(node.expression) &&
                        node.expression.text === 'routerAdd'
                    ) {
                        hasRouter = true
                    }
                }

                // Continue traversing the AST
                ts.forEachChild(node, visit);
            }

            visit(sourceFile)
            if (!hasRouter) return sourceFile

            const mapping = getMapping(sourceFile.fileName);
            const { id, filename } = generateSplitFile(sourceFile.fileName, mapping?.hash)

            const hash = id

            // Use existing mapping if available, otherwise create new
            const splitHash = mapping?.hash || hash;
            trackFile(sourceFile.fileName, `${filename}`, splitHash);
            return sourceFile;
        };
    };
}

