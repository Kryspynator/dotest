import { suite, expect } from "../src/index.ts";

suite("Chaining Suite - Basic")
    .test("first test", () => {
        expect(1).toBe(1);
    })
    .test("second test", () => {
        expect(2).toBe(2);
    });

suite("Chaining Suite - Hooks")
    .beforeAll(() => ({ a: 1 }))
    .beforeAll(() => ({ b: 2 }))
    .beforeEach(() => ({ c: 3 }))
    .beforeEach(() => ({ d: 4 }))
    .test(
        "receives all data",
        (all: { a: number; b: number }, each: { c: number; d: number }) => {
            expect(all).toEqual({ a: 1, b: 2 });
            expect(each).toEqual({ c: 3, d: 4 });
        }
    );

suite("Chaining Suite - Mixed Tests")
    .test("normal test", () => {
        expect(true).toBe(true);
    })
    .testEach("parameterized", [1, 2], (val: number) => {
        expect(val).toBeDefined();
    })
    .test("another normal test", () => {
        expect(false).toBeFalsy();
    });

suite("Chaining Suite - Data Flow")
    .beforeAll(() => ({ count: 0 }))
    .test("first", (all: { count: number }) => {
        expect(all.count).toBe(0);
    })
    .test("second", (all: { count: number }) => {
        // Data is immutable per test run context in this implementation
        expect(all.count).toBe(0);
    });

suite("Chaining Suite - Async Hooks")
    .beforeAll(async () => {
        await new Promise((r) => setTimeout(r, 10));
        return { async: true };
    })
    .test("async data", (all: { async: boolean }) => {
        expect(all.async).toBe(true);
    });
