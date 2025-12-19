import { suite, expect } from "../src/index.ts";

let hookRan = false;

suite("After Hooks Ordering Suite")
    .test("test defined before hook", () => {
        expect(true).toBe(true);
    })
    .afterAll(() => {
        hookRan = true;
    });

// We need a way to verify the hook ran *after* the suite finishes.
// Since we can't easily assert outside the suite in this framework yet without another suite,
// we'll rely on the fact that if the hook doesn't run, we might be able to detect it
// or we can add another suite that checks the global variable.

suite("Verification Suite").test("verify hook ran", () => {
    expect(hookRan).toBe(true);
});
