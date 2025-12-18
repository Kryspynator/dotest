import { suite, expect } from "../src/index.ts";

suite("Parameterized Suite")
    .testEach("string", [1, 2, 3], (val) => {
        expect(val).toBeDefined();
    })
    .testEach(
        (val) => `function ${val}`,
        [4, 5, 6],
        (val) => {
            expect(val).toBeDefined();
        }
    );
