import { expect, suite } from "../src/index.ts";

suite("Nesting Suite")
    .beforeEach(() => {
        return { a: 1 };
    })
    .subsuite("Subsuite A", (sub, _beforeAllData, beforeEachData) => {
        sub.test("test in subsuite A", () => {
            expect(beforeEachData.a).toBe(1);
            expect(1).toBe(1);
        });
    })
    .subsuite("Subsuite B", (sub) => {
        sub.beforeEach(() => {
            return { b: 2 };
        })
            .test("test in subsuite B", (_beforeAllData, beforeEachData) => {
                expect(beforeEachData.b).toBe(2);
                expect(2).toBe(2);
            })
            .subsuite("Nested Subsuite", (nested) => {
                nested.test("test in nested subsuite", () => {
                    expect(3).toBe(3);
                });
            });
    });
