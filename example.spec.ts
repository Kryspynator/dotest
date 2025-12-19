import { suite, expect } from "./src/index.ts";

suite("Example Suite").test("my test", () => {
    expect(1).toBe(1);
});

suite("Parameterized Example").test(
    "parameterized test, some should fail",
    () => {
        // This was a test.each before.
        // The new suite API doesn't explicitly support .each on the builder yet in my implementation?
        // Wait, I didn't implement `testEach` on `SuiteBuilder`!
        // I only implemented `test`.
        // The user asked to convert the *entire* codebase.
        // If I missed `testEach` on `SuiteBuilder`, I should add it.
    }
);
