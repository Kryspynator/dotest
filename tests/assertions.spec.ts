import { suite, expect } from "../src/index.ts";

suite("Assertions Suite")
    .test("basic", () => {
        expect(1).toBe(1);
        expect(true).toBeTruthy();
        expect(false).toBeFalsy();
        expect(undefined).toBeUndefined();
        expect(1).toBeDefined();
        expect(null).toBeNullish();
    })
    .test("objects", () => {
        expect({ a: 1 }).toEqual({ a: 1 });
        expect([1, 2]).toEqual([1, 2]);
    })
    .test("errors", () => {
        expect(() => {
            throw new Error("boom");
        }).toThrow();
    })
    .test("async", async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        expect(true).toBe(true);
    });
