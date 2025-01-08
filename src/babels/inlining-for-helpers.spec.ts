
// transformForConstToLet.test.js
import babel from "@babel/core"
import transformForConstToLet from "./inlining-for-helpers"
import { describe, it, expect } from "vitest"

describe("babel-plugin-transform-for-const-to-let", () => {
    it("transforms for loops with const to let", () => {
        const inputCode = `

      const arr = [1,2,3];
      for (const i of arr){
        console.log("I",i)
      }

      for (const [index, item] of items.entries()) {
        console.log(index, item);
      }

      for (let j = 0; j < 5; j++) {
        console.log(j);
      }
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
            plugins: [transformForConstToLet],
            configFile: false,
        });

        console.log("CA", code.trim())
        expect(code.trim()).toBe(expectedOutput.trim());
    });
});
