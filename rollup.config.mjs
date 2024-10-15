import resolve from '@rollup/plugin-node-resolve';
import typescript from "typescript"
import * as typescriptPlugin from '@rollup/plugin-typescript';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import dts from 'rollup-plugin-dts';
import watch from 'rollup-plugin-watch';
import fs from 'fs';
import path from 'path';
import babel from '@rollup/plugin-babel';
import { fileURLToPath } from 'node:url';
import toolCompiler from "./helpers/tool_compiler.js"

const isProduction = process.env.NODE_ENV === 'production';
const buildInfo = JSON.parse(fs.readFileSync('config.json', 'utf8'));
const destination = buildInfo.destination;
const outputFolder = buildInfo.compileOutputName;
const getOutputPath = (destination) => `${destination}${outputFolder}`
const sourceDir = buildInfo["sourceDir"] ?? "./src"

// Custom plugin to transpile additional files
function transpileSource() {
    const modules = fs.readdirSync(sourceDir);
    return {
        name: 'transpile-source',
        async buildStart() {
            for (const file of modules) {
                const filePath = `${sourceDir}/${file}`
                this.addWatchFile(filePath)
                const source = await fs.promises.readFile(filePath, 'utf-8')
                const { outputText } = typescript.transpileModule(source, {
                    compilerOptions: { module: 'ESNext' },
                });

                this.emitFile({
                    type: 'chunk',
                    id: filePath,
                    code: outputText,
                    fileName: path.basename(filePath).replace('.ts', '.js'),
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
            return toolCompiler.compileTools()
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
    transpileSource(['src/validator.ts', 'src/utils.ts', 'src/services.ts']),
    createToolingScript(),
    typescriptPlugin.default({
        tsconfig: './tsconfig.json',
        outDir: getOutputPath(destination),
    }),
    babel({
        babelHelpers: 'bundled',
        // presets: ["@babel/preset-env"],
        // plugins: ['./babel-plugin-transform-local-scope.js', "@babel/plugin-transform-modules-commonjs"], // Include your custom plugin here
        extensions: ['.js', '.ts'],
    }),
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
                    watch({ dir: 'src', exclude: ['node_modules/**'] });
                }
            },
        ].filter(Boolean),
        external: ['zod'], // Add any other external dependencies here
    },
];

