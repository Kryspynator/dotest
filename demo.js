import { test, run, expect, before, after } from "./index.ts";

test("Dotest Framework", () => {
    before.all(() => {
        return { info: "Data can be passed through return statements!" };
    });

    test("Passes", () => {
        expect(true).toBe(true);
    });

    test("Fails", () => {
        expect(false).toBe(true);
    });

    test("Throws", () => {
        expect(() => {
            throw new Error("This is an error");
        }).toThrow();
    });

    after.all(({ info }) => {
        console.log(`Received info: ${info}`);
    });
});

run();
