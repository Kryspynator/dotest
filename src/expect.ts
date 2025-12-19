export function expect<T>(actual: T) {
    const createMatchers = (isNot: boolean) => ({
        toBe(expected: T) {
            const pass = Object.is(actual, expected);
            if (isNot ? pass : !pass) {
                throw new Error(
                    `Expected ${JSON.stringify(actual)} ${isNot ? "not " : ""}to be ${JSON.stringify(expected)}`
                );
            }
        },
        toEqual(expected: T) {
            const pass = JSON.stringify(actual) === JSON.stringify(expected);
            if (isNot ? pass : !pass) {
                throw new Error(
                    `Expected ${JSON.stringify(actual)} ${isNot ? "not " : ""}to equal ${JSON.stringify(expected)}`
                );
            }
        },
        toBeTruthy() {
            const pass = !!actual;
            if (isNot ? pass : !pass) {
                throw new Error(
                    `Expected ${actual} ${isNot ? "not " : ""}to be truthy`
                );
            }
        },
        toBeFalsy() {
            const pass = !actual;
            if (isNot ? pass : !pass) {
                throw new Error(
                    `Expected ${actual} ${isNot ? "not " : ""}to be falsy`
                );
            }
        },
        toBeDefined() {
            const pass = typeof actual !== "undefined";
            if (isNot ? pass : !pass) {
                throw new Error(
                    `Expected ${actual} ${isNot ? "not " : ""}to be defined`
                );
            }
        },
        toBeUndefined() {
            const pass = typeof actual === "undefined";
            if (isNot ? pass : !pass) {
                throw new Error(
                    `Expected ${actual} ${isNot ? "not " : ""}to be undefined`
                );
            }
        },
        toBeNullish() {
            const pass = actual === null || actual === undefined;
            if (isNot ? pass : !pass) {
                throw new Error(
                    `Expected ${actual} ${isNot ? "not " : ""}to be null or undefined`
                );
            }
        },
        toBeNaN() {
            const pass = Number.isNaN(actual);
            if (isNot ? pass : !pass) {
                throw new Error(
                    `Expected ${actual} ${isNot ? "not " : ""}to be NaN`
                );
            }
        },
        toBeInstanceOf(expected: any) {
            const pass = actual instanceof expected;
            if (isNot ? pass : !pass) {
                throw new Error(
                    `Expected ${actual} ${isNot ? "not " : ""}to be an instance of ${expected.name || expected}`
                );
            }
        },
        toBeGreaterThan(expected: number) {
            const pass = (actual as any) > expected;
            if (isNot ? pass : !pass) {
                throw new Error(
                    `Expected ${actual} ${isNot ? "not " : ""}to be greater than ${expected}`
                );
            }
        },
        toBeLessThan(expected: number) {
            const pass = (actual as any) < expected;
            if (isNot ? pass : !pass) {
                throw new Error(
                    `Expected ${actual} ${isNot ? "not " : ""}to be less than ${expected}`
                );
            }
        },
        toBeGreaterThanOrEqual(expected: number) {
            const pass = (actual as any) >= expected;
            if (isNot ? pass : !pass) {
                throw new Error(
                    `Expected ${actual} ${isNot ? "not " : ""}to be greater than or equal to ${expected}`
                );
            }
        },
        toBeLessThanOrEqual(expected: number) {
            const pass = (actual as any) <= expected;
            if (isNot ? pass : !pass) {
                throw new Error(
                    `Expected ${actual} ${isNot ? "not " : ""}to be less than or equal to ${expected}`
                );
            }
        },
        toContain(item: any) {
            const pass =
                Array.isArray(actual) || typeof actual === "string"
                    ? (actual as any).includes(item)
                    : false;
            if (isNot ? pass : !pass) {
                throw new Error(
                    `Expected ${JSON.stringify(actual)} ${isNot ? "not " : ""}to contain ${JSON.stringify(item)}`
                );
            }
        },
        toHaveLength(length: number) {
            const pass = (actual as any)?.length === length;
            if (isNot ? pass : !pass) {
                throw new Error(
                    `Expected ${JSON.stringify(actual)} ${isNot ? "not " : ""}to have length ${length}`
                );
            }
        },
        toMatch(pattern: string | RegExp) {
            const pass = new RegExp(pattern).test(actual as any);
            if (isNot ? pass : !pass) {
                throw new Error(
                    `Expected ${actual} ${isNot ? "not " : ""}to match ${pattern}`
                );
            }
        },
        toHaveProperty(path: string, value?: any) {
            const parts = path.split(".");
            let obj: any = actual;
            for (const part of parts) {
                if (obj === null || obj === undefined) {
                    obj = undefined;
                    break;
                }
                obj = obj[part];
            }
            const exists = obj !== undefined;
            const pass = exists && (arguments.length < 2 || obj === value);
            if (isNot ? pass : !pass) {
                throw new Error(
                    `Expected ${JSON.stringify(actual)} ${isNot ? "not " : ""}to have property "${path}"${arguments.length >= 2 ? ` with value ${JSON.stringify(value)}` : ""}`
                );
            }
        },
        toThrow(
            expectedError?:
                | string
                | RegExp
                | Error
                | (new (...args: any[]) => Error)
        ) {
            if (typeof actual !== "function") {
                throw new Error(
                    "expect() argument must be a function to use .toThrow()"
                );
            }

            let thrownError: any;
            try {
                actual();
            } catch (e) {
                thrownError = e;
            }

            let pass = !!thrownError;
            if (pass && expectedError) {
                if (typeof expectedError === "string") {
                    pass = thrownError.message.includes(expectedError);
                } else if (expectedError instanceof RegExp) {
                    pass = expectedError.test(thrownError.message);
                } else if (expectedError instanceof Error) {
                    pass = thrownError.message === expectedError.message;
                } else if (typeof expectedError === "function") {
                    pass = thrownError instanceof expectedError;
                }
            }

            if (isNot ? pass : !pass) {
                const msg = expectedError
                    ? ` throw error matching ${expectedError}`
                    : " throw an error";
                throw new Error(
                    `Expected function ${isNot ? "not to" : "to"}${msg}`
                );
            }
        },
    });

    return {
        ...createMatchers(false),
        not: createMatchers(true),
    };
}
