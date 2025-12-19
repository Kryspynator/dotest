import { suite, expect } from "../src/index.ts";

suite("Expect Matchers")
    .test("toBe and .not.toBe", () => {
        expect(1).toBe(1);
        expect(1).not.toBe(2);
    })
    .test("toEqual and .not.toEqual", () => {
        expect({ a: 1 }).toEqual({ a: 1 });
        expect({ a: 1 }).not.toEqual({ a: 2 });
    })
    .test("toBeTruthy and toBeFalsy", () => {
        expect(true).toBeTruthy();
        expect(false).toBeFalsy();
        expect(1).toBeTruthy();
        expect(0).toBeFalsy();
    })
    .test("toBeDefined and toBeUndefined", () => {
        expect(1).toBeDefined();
        expect(undefined).toBeUndefined();
    })
    .test("toBeNullish", () => {
        expect(null).toBeNullish();
        expect(undefined).toBeNullish();
        expect(0).not.toBeNullish();
    })
    .test("toBeNaN", () => {
        expect(NaN).toBeNaN();
        expect(1).not.toBeNaN();
    })
    .test("toBeGreaterThan and toBeLessThan", () => {
        expect(10).toBeGreaterThan(5);
        expect(5).toBeLessThan(10);
        expect(10).toBeGreaterThanOrEqual(10);
        expect(10).toBeLessThanOrEqual(10);
    })
    .test("toContain", () => {
        expect([1, 2, 3]).toContain(2);
        expect("hello").toContain("ell");
    })
    .test("toHaveLength", () => {
        expect([1, 2, 3]).toHaveLength(3);
        expect("hello").toHaveLength(5);
    })
    .test("toMatch", () => {
        expect("hello world").toMatch("world");
        expect("hello world").toMatch(/w.rld/);
    })
    .test("toHaveProperty", () => {
        const obj = { a: { b: 1 }, c: 2 };
        expect(obj).toHaveProperty("a.b");
        expect(obj).toHaveProperty("a.b", 1);
        expect(obj).toHaveProperty("c", 2);
        expect(obj).not.toHaveProperty("a.z");
    })
    .test("toThrow", () => {
        const fail = () => {
            throw new Error("boom");
        };
        const succeed = () => {};

        expect(fail).toThrow();
        expect(fail).toThrow("boom");
        expect(fail).toThrow(/bo.m/);
        expect(fail).toThrow(Error);
        expect(succeed).not.toThrow();
    });
