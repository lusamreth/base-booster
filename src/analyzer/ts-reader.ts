import * as fs from 'fs';
import * as ts from 'typescript';

import { readTypeScriptFiles, analyzeSourceFile } from "./module-analyzer"
// Main execution
const projectDir = 'src'; // Replace with your project directory
const files = readTypeScriptFiles(projectDir);

files.forEach((file) => {
    const sourceCode = fs.readFileSync(file, 'utf8');
    const sourceFile = ts.createSourceFile(
        file,
        sourceCode,
        ts.ScriptTarget.Latest,
        true
    );

    const result = analyzeSourceFile(sourceFile);
    console.log("RES", JSON.stringify(result), file)

});
