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

suite("After Hooks Injection Suite")
    .beforeAll(() => {
        return { db: "connected" };
    })
    .afterAll((data: { db: string }) => {
        expect(data.db).toBe("connected");
    })
    .test("dummy test for all hooks", () => {
        expect(true).toBe(true);
    });

suite("After Each Hooks Injection Suite")
    .beforeEach(() => {
        return { user: "admin" };
    })
    .afterEach((data: { user: string }) => {
        expect(data.user).toBe("admin");
    })
    .test("dummy test for each hooks", () => {
        expect(true).toBe(true);
    });
