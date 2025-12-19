import { expect, suite } from "../src/index.ts";

suite("Nesting Suite")
    .subsuite("Subsuite A", (s) => {
        s.test("test in subsuite A", () => {
            expect(1).toBe(1);
        });
    })
    .subsuite("Subsuite B", (s) => {
        s.test("test in subsuite B", () => {
            expect(2).toBe(2);
        });

        s.subsuite("Nested Subsuite", (ns) => {
            ns.test("test in nested subsuite", () => {
                expect(3).toBe(3);
            });
        });
    });
