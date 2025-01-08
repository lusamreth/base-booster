import resolve from '@rollup/plugin-node-resolve';
import typescript from "typescript"
import * as typescriptPlugin from '@rollup/plugin-typescript';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import watch from 'rollup-plugin-watch';
import fs from 'fs';
import path from 'path';
import babel from '@rollup/plugin-babel';

import { compileTools } from "./lib/helpers/tool-compiler.js"
import { getSourceDir } from "./lib/helpers/utils.js"

import { createTrackingTransformer } from "./lib/transformers/split-transform.js"
import terser from '@rollup/plugin-terser';

const isProduction = process.env.NODE_ENV === 'production';
const buildInfo = JSON.parse(fs.readFileSync('config.json', 'utf8'));
const destination = buildInfo.destination;
const outputFolder = buildInfo.compileOutputName;
const getOutputPath = (destination) => `${destination}${outputFolder}`
const sourceDir = getSourceDir()
console.log("SS,", sourceDir)
const rootDir = path.resolve(sourceDir, "../")

/**
 * Recursively retribeves all files with the specified extension from a directory.
 * @param {string} dir - The directory to traverse.
 * @param {string} ext - The file extension to filter by (e.g., '.ts').
 * @param {Array<string>} [files=[]] - Accumulator for collected file paths.
 * @returns {Array<string>} - An array of file paths.
 */
function getAllFiles(dir, ext, files = []) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            getAllFiles(fullPath, ext, files);
        } else if (entry.isFile() && path.extname(fullPath) === ext) {
            files.push(fullPath);
        }
    }

    return files;
}


// Custom plugin to transpile additional files
function transpileSource() {
    return {
        name: 'transpile-source',
        async buildStart() {
            // Retrieve all .ts files recursively from the source directory
            const allFiles = getAllFiles(sourceDir, '.ts');
            for (const filePath of allFiles) {
                this.addWatchFile(filePath)
                const source = await fs.promises.readFile(filePath, 'utf-8')
                const { outputText } = typescript.transpileModule(source, {
                    compilerOptions: { module: 'ESNext', sourceMap: true },
                });

                // Determine the output file path, preserving directory structure
                const relativePath = path.relative(sourceDir, filePath);
                const outputFileName = relativePath.replace(/\.ts$/, '.js');

                // Emit the transpiled JavaScript as a chunk
                this.emitFile({
                    type: 'chunk',
                    id: filePath,
                    code: outputText,
                    map: null, // You can include source maps if needed
                    fileName: outputFileName,
                });
            }


        }
    }
}

// Custom plugin to transpile additional files
function createToolingScript() {
    return {
        name: 'transpile-tooling-script',
        async buildStart() {
            console.log("Start building tools....")
            return compileTools()
        }
    }
}
const sharedPlugins = [
    resolve({
        preferBuiltins: true,
        browser: false,
    }),
    commonjs(),
    json(),
    transpileSource(),
    createToolingScript(),
    typescriptPlugin.default({
        tsconfig: `${rootDir}/tsconfig.json`,
        transformers: {
            after: [
                createTrackingTransformer()
            ]
        },
        outDir: getOutputPath(destination),
    }),
    babel({
        babelHelpers: 'bundled',
        extensions: ['.js', '.ts'],
    }),
    terser()

];


if (!destination) {
    throw new Error("Must set destination in the build_info.json")
}

export default [
    {
        output: {
            dir: getOutputPath(destination),
            format: 'cjs',
            exports: 'auto',
        },
        plugins: [
            ...sharedPlugins,
            !isProduction && {
                name: 'watch-external',
                buildStart() {
                    watch({ dir: "testings/src", exclude: ['node_modules/**'] });
                }
            },
        ].filter(Boolean),
        external: ['zod'], // Add any other external dependencies here
    },
];

