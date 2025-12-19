import { expect, suite } from "../src/index.ts";

suite("Nesting Suite")
    .subsuite("Subsuite A", (suite) => {
        suite.test("test in subsuite A", () => {
            expect(1).toBe(1);
        });
    })
    .subsuite("Subsuite B", (suite) => {
        suite.test("test in subsuite B", () => {
            expect(2).toBe(2);
        });

        suite.subsuite("Nested Subsuite", (suite) => {
            suite.test("test in nested subsuite", () => {
                expect(3).toBe(3);
            });
        });
    });
