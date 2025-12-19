import { expect, suite } from "../src/index.ts";

suite("Nesting").test("should run nested tests", () => {
    suite("Nesting - Nested").test("hello", () => {
        expect(true).toBe(true);
    });
});
