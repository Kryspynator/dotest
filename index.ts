interface Suite {
    name: string;
    parent: Suite | null;
    children: Suite[];
    tests: { name: string; fn: Function }[];
    beforeAll: Function;
    afterAll: Function;
    beforeEach: Function;
    afterEach: Function;
}

const print = console.log;

const indentString = "   ";

class Dotest {
    rootSuite: Suite;
    currentSuite: Suite;

    constructor() {
        this.rootSuite = this.createSuite("root", null);
        this.currentSuite = this.rootSuite;
    }

    createSuite(name, parent): Suite {
        return {
            name,
            parent,
            children: [],
            tests: [],
            beforeAll: () => {},
            afterAll: () => {},
            beforeEach: () => {},
            afterEach: () => {},
        };
    }

    test(name, fn) {
        const hasNestedTests = this.detectNestedTests(fn);

        if (hasNestedTests) {
            const suite = this.createSuite(name, this.currentSuite);
            this.currentSuite.children.push(suite);

            const previousSuite = this.currentSuite;
            this.currentSuite = suite;

            try {
                fn();
            } finally {
                this.currentSuite = previousSuite;
            }
        } else {
            this.currentSuite.tests.push({ name, fn });
        }
    }

    testEach(name, testCases, fn) {
        if (!Array.isArray(testCases) || testCases.length === 0) {
            throw new Error(
                "test.each requires a non-empty array of test cases"
            );
        }

        const suite = this.createSuite(name, this.currentSuite);
        this.currentSuite.children.push(suite);

        for (const testCase of testCases) {
            const testName = `${name} - ${JSON.stringify(testCase)}`;
            suite.tests.push({
                name: testName,
                fn: () => fn({ testCase }),
            });
        }
    }

    detectNestedTests(fn) {
        let hasNested = false;
        const originalTest = this.test.bind(this);

        this.test = () => {
            hasNested = true;
        };

        try {
            fn();
        } catch (e) {
            hasNested = false;
        } finally {
            this.test = originalTest;
        }

        return hasNested;
    }

    beforeAll(fn) {
        this.currentSuite.beforeAll = fn;
    }

    afterAll(fn) {
        this.currentSuite.afterAll = fn;
    }

    beforeEach(fn) {
        this.currentSuite.beforeEach = fn;
    }

    afterEach(fn) {
        this.currentSuite.afterEach = fn;
    }

    expect(actual: unknown) {
        const assertions = {
            toBe(expected) {
                if (!Object.is(actual, expected)) {
                    throw new Error(`Expected ${actual} to be ${expected}`);
                }
            },
            toEqual(expected) {
                if (JSON.stringify(actual) !== JSON.stringify(expected)) {
                    throw new Error(
                        `Expected ${JSON.stringify(
                            actual
                        )} to equal ${JSON.stringify(expected)}`
                    );
                }
            },
            toBeTruthy() {
                if (!actual) {
                    throw new Error(`Expected ${actual} to be truthy`);
                }
            },
            toBeFalsy() {
                if (actual) {
                    throw new Error(`Expected ${actual} to be falsy`);
                }
            },
            toBeDefined() {
                if (typeof actual === "undefined") {
                    throw new Error(`Expected ${actual} to be defined`);
                }
            },
            toBeNullish() {
                if (actual !== null && actual !== undefined) {
                    throw new Error(
                        `Expected ${actual} to be null or undefined`
                    );
                }
            },
            toBeInstanceOf(expected) {
                if (!(actual instanceof expected)) {
                    throw new Error(
                        `Expected ${actual} to be an instance of ${expected}`
                    );
                }
            },
            toThrow(data) {
                if (typeof actual !== "function") {
                    throw new Error(
                        "Expected value must be a function when using toThrow"
                    );
                }
                try {
                    actual(data);
                    throw new Error(
                        "Expected function to throw, but it did not"
                    );
                } catch (e) {
                    if (
                        e.message ===
                        "Expected function to throw, but it did not"
                    ) {
                        throw e;
                    }
                }
            },
        };

        function not() {
            throw new Error("Not implemented yet");
        }

        return {
            ...assertions,
            not,
        };
    }

    async run() {
        print("🧪 Running tests...\n");

        await this.executeSuite(this.rootSuite, -1);

        print("\n✅ Test execution complete");
    }

    async executeSuite(suite: Suite, depth: number) {
        const indent = indentString.repeat(Math.max(0, depth));

        if (depth >= 0) {
            print(`${indent}📁 ${suite.name}`);
        }

        const data = await suite.beforeAll();

        for (const test of suite.tests) {
            await this.executeTestWithHooks(test, suite, depth + 1);
        }

        for (const child of suite.children) {
            await this.executeSuite(child, depth + 1);
        }

        await suite.afterAll(data);
    }

    async executeTestWithHooks(test, suite, depth) {
        const indent = indentString.repeat(depth);
        print(`${indent}🔍 ${test.name}`);

        const beforeEach = this.collectHookFromRoot(suite, "beforeEach");
        const afterEach = this.collectHookFromRoot(suite, "afterEach");

        let data = {};

        try {
            data = beforeEach();
            try {
                try {
                    await test.fn(data);

                    print(`${indent}${indentString}✅ Passed`);
                } catch (error) {
                    print(
                        `${indent}${indentString}❌ Failed: ${error.message}`
                    );
                } finally {
                    afterEach(data);
                }
            } catch (error) {
                print(
                    `${indent}${indentString}❌ Failed In AfterEach: ${error.message}`
                );
            }
        } catch (error) {
            console.log(
                `${indent}${indentString}❌ Failed In BeforeEach: ${error.message}`
            );
        }
    }

    async executeTest(test) {
        try {
            await test.fn();
            return { passed: true };
        } catch (error) {
            return { passed: false, error: error.message };
        }
    }

    collectHookFromRoot(suite, hookType) {
        let hook;
        let current = suite;

        // Collect hooks from current suite up to root
        while (current && current.name !== "root") {
            hook = current[hookType];
            current = current.parent;
        }

        return hook;
    }
}

const dotest = new Dotest();

// Exports
export const before = {
    all: (fn) => dotest.beforeAll(fn),
    each: (fn) => dotest.beforeEach(fn),
};

export const after = {
    all: (fn) => dotest.afterAll(fn),
    each: (fn) => dotest.afterEach(fn),
};

export const test = Object.assign((name, fn) => dotest.test(name, fn), {
    each: (name, testCases, fn) => dotest.testEach(name, testCases, fn),
});

export const expect = (actual) => dotest.expect(actual);

export const run = () => dotest.run();
