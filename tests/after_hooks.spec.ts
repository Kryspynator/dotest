import { suite, expect } from "../src/index.ts";

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
