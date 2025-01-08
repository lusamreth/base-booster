// transformForConstToLet.test.js
import babel from "@babel/core"
import generalizedTransform from "./inlining-general"
import { describe, it, expect } from "vitest"
import vm from "vm"

describe("babel-plugin-transform-generalized", () => {
    it("transforms for loops with const to let", () => {
        const inputCode = `
        function a(){
            const testVar = ""
            if (typeof testVar === "string"){
                console.log("AVI")
            }
        }
        a()
    `;

        const expectedOutput = `
const arr = [1, 2, 3];
for (let _i = 0; _i < arr.length; _i++) {
  const i = arr[_i];
  console.log("I", i);
}
for (const [index, item] of items.entries()) {
  console.log(index, item);
}
for (let j = 0; j < 5; j++) {
  console.log(j);
}
    `;

        const { code } = babel.transformSync(inputCode, {
            plugins: [
                generalizedTransform
            ],

            configFile: false,
        });

        console.log("CA", code.trim())

        const sandbox = { console };
        vm.createContext(sandbox);
        const script = new vm.Script(code);
        const result = script.runInContext(sandbox);
        console.log("RES", result)

        expect(code.trim()).toBe(expectedOutput.trim());
    });
});
