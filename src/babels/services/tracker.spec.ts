
// src/trackFunctionCalls.test.ts
import { describe, it, expect } from "vitest";
import { parse } from "@babel/parser";
import traverse from "@babel/traverse";
import { NodePath } from "@babel/core";
import * as t from "@babel/types";
import { trackFunctionCalls } from "./tracker";

describe("trackFunctionCalls", () => {
    it("should correctly map function calls within functions", () => {
        const code = `
      function foo() {
        bar();
        baz();
      }

      const bar = () => {
        baz();
      }

      function baz() {
        // No function calls
      }

      const qux = function() {
        foo();
        quux();
      };
    `;

        // Parse the code to generate AST
        const ast = parse(code, {
            sourceType: "module",
            plugins: ["typescript"],
        });

        // Initialize a map to hold expected function calls
        const expectedMap = new Map<string, Set<string>>([
            ["foo", new Set(["bar", "baz"])],
            ["bar", new Set(["baz"])],
            ["qux", new Set(["foo", "quux"])],
        ]);

        // Traverse the AST to find function declarations and expressions
        const actualMap = new Map<string, Set<string>>();

        traverse(ast, {
            // Handle Function Declarations
            FunctionDeclaration(path: NodePath<t.FunctionDeclaration>) {
                const calls = trackFunctionCalls(path);
                for (const [key, value] of calls.entries()) {
                    actualMap.set(key, value);
                }
            },
            // Handle Function Expressions and Arrow Functions assigned to variables
            VariableDeclarator(path: NodePath<t.VariableDeclarator>) {
                if (
                    t.isFunctionExpression(path.node.init) ||
                    t.isArrowFunctionExpression(path.node.init)
                ) {
                    const funcPath = path.get("init") as NodePath<
                        t.FunctionExpression | t.ArrowFunctionExpression
                    >;
                    const calls = trackFunctionCalls(funcPath);
                    for (const [key, value] of calls.entries()) {
                        actualMap.set(key, value);
                    }
                }
            },
        });
        console.log("A", actualMap)
        // Compare the actualMap with the expectedMap
        expect(actualMap.size).toBe(expectedMap.size);
        for (const [key, expectedSet] of expectedMap.entries()) {
            expect(actualMap.has(key)).toBe(true);
            const actualSet = actualMap.get(key);
            expect(actualSet).toEqual(expectedSet);
        }
    });
});
