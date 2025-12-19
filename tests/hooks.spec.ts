import { suite, expect, test } from "../src/index.ts";

suite("Hooks & Data Suite")
    .beforeAll(() => {
        return { count: 0 };
    })
    .beforeEach(() => {
        return { localCount: 0 };
    })
    .test(
        "hooks check",
        (all: { count: number }, each: { localCount: number }) => {
            expect(all).toEqual({ count: 0 });
            expect(each).toEqual({ localCount: 0 });
        }
    )
    .test("nested suite", () => {
        test("inner test", () => {
            expect(true).toBe(true);
        });
    });

suite("Data Injection Suite")
    .beforeAll(() => {
        return { global: "data" };
    })
    .beforeEach(() => {
        return { local: "data" };
    })
    .test(
        "receives injected data",
        (allData: { global: string }, eachData: { local: string }) => {
            expect(allData).toEqual({ global: "data" });
            expect(eachData).toEqual({ local: "data" });
        }
    );
