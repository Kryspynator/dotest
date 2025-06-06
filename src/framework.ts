import type {
    AfterFunc,
    BeforeFunc,
    Reporter,
    RunArgs,
    Suite,
    Test,
    TestCaseFunc,
    TestFunc,
} from "./types.ts";

export class Dotest {
    rootSuite: Suite<any, any>;
    currentSuite: Suite<any, any>;
    reporter: Reporter = {} as Reporter;

    constructor() {
        this.rootSuite = this.createSuite("root", null);
        this.currentSuite = this.rootSuite;
    }

    private createSuite(
        name: string,
        parent: Suite<any, any> | null
    ): Suite<any, any> {
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

    test<BA, BE>(name: string, fn: TestFunc<BA, BE>) {
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

    testEach<BA, BE, TC>(
        name: string,
        testCases: TC[],
        fn: TestCaseFunc<BA, BE, TC>
    ) {
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
                fn: (beforeAll: BA, beforeEach: BE) =>
                    fn(beforeAll, beforeEach, testCase),
            });
        }
    }

    detectNestedTests<BA, BE>(fn: TestFunc<BA, BE>): boolean {
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

    beforeAll<Data>(fn: BeforeFunc<Data>) {
        this.currentSuite.beforeAll = fn;
    }

    afterAll<Data>(fn: AfterFunc<Data>) {
        this.currentSuite.afterAll = fn;
    }

    beforeEach<Data>(fn: BeforeFunc<Data>) {
        this.currentSuite.beforeEach = fn;
    }

    afterEach<Data>(fn: AfterFunc<Data>) {
        this.currentSuite.afterEach = fn;
    }

    expect<T>(actual: T) {
        const assertions = {
            toBe(expected: T) {
                if (!Object.is(actual, expected)) {
                    throw new Error(`Expected ${actual} to be ${expected}`);
                }
            },
            toEqual(expected: T) {
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
            toBeInstanceOf(expected: any) {
                if (!(actual instanceof expected)) {
                    throw new Error(
                        `Expected ${actual} to be an instance of ${expected}`
                    );
                }
            },
            toThrow(data?: any) {
                if (typeof actual !== "function") {
                    throw new Error(
                        "Expected value must be a function when using toThrow"
                    );
                }
                try {
                    actual(...data);
                    throw new Error(
                        "Expected function to throw, but it did not"
                    );
                } catch (e: any) {
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

    async run({ reporter }: RunArgs) {
        this.reporter = reporter;

        reporter.info("🧪 Running tests...\n");

        await this.executeSuite(this.rootSuite, -1);

        reporter.info("\n✅ Test execution complete");
    }

    private async executeSuite<BA, BE>(suite: Suite<BA, BE>, depth: number) {
        if (depth >= 0) {
            this.reporter.startedSpec(suite.name, depth);
        }

        const data = await suite.beforeAll();

        for (const test of suite.tests) {
            await this.executeTestWithHooks(test, suite, depth + 1, data);
        }

        for (const child of suite.children) {
            await this.executeSuite(child, depth + 1);
        }

        await suite.afterAll(data);
    }

    private async executeTestWithHooks<BA, BE>(
        test: Test<BA, BE>,
        suite: Suite<BA, BE>,
        depth: number,
        beforeAllData: BA
    ) {
        this.reporter.startedTest(test.name, depth);

        const beforeEach: BeforeFunc<BE> = this.collectHookFromRoot(
            suite,
            "beforeEach"
        );
        const afterEach: AfterFunc<BE> = this.collectHookFromRoot(
            suite,
            "afterEach"
        );

        let data: BE | null = null;

        try {
            data = await beforeEach();
            try {
                try {
                    await test.fn(beforeAllData, data);

                    this.reporter.passedTest(depth + 1);
                } catch (error: any) {
                    this.reporter.failedTest(error, depth + 1);
                } finally {
                    afterEach(data);
                }
            } catch (error: any) {
                this.reporter.failedTest(error, depth + 1);
            }
        } catch (error: any) {
            this.reporter.failedTest(error, depth + 1);
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
