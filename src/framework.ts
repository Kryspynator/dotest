import { Timer } from "timer-node";
import { defaultReporter } from "./reporter.ts";
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
    reporter: Reporter = defaultReporter;
    testTimeout: number = 5000;

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
            hooks: {
                beforeAll: () => {},
                afterAll: () => {},
                beforeEach: () => {},
                afterEach: () => {},
            },
            failed: 0,
            passed: 0,
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
        this.currentSuite = suite;

        for (const testCase of testCases) {
            this.test(
                `${name} - ${JSON.stringify(testCase)}`,
                (beforeAll: BA, beforeEach: BE) =>
                    fn(beforeAll, beforeEach, testCase)
            );
        }
        this.currentSuite = this.currentSuite.parent || this.rootSuite;
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
        this.currentSuite.hooks.beforeAll = fn;
    }

    afterAll<Data>(fn: AfterFunc<Data>) {
        this.currentSuite.hooks.afterAll = fn;
    }

    beforeEach<Data>(fn: BeforeFunc<Data>) {
        this.currentSuite.hooks.beforeEach = fn;
    }

    afterEach<Data>(fn: AfterFunc<Data>) {
        this.currentSuite.hooks.afterEach = fn;
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

    async run({ reporter, testTimeout }: RunArgs) {
        this.reporter = reporter;
        this.testTimeout = testTimeout;

        this.reporter.startedAll();
        await this.executeSuite(this.rootSuite, -1);
        this.reporter.finishedAll(this.rootSuite.failed, this.rootSuite.passed);
    }

    private async executeSuite<BA, BE>(suite: Suite<BA, BE>, depth: number) {
        if (depth >= 0) {
            this.reporter.startedSuite(suite.name, depth);
        }

        const data = await suite.hooks.beforeAll();

        for (const test of suite.tests) {
            await this.executeTest(test, suite, depth + 1, data);
        }

        for (const child of suite.children) {
            await this.executeSuite(child, depth + 1);
        }

        await suite.hooks.afterAll(data);
        this.reporter.finishedSuite(
            suite.name,
            depth,
            suite.failed,
            suite.passed
        );
    }

    private async executeTest<BA, BE>(
        test: Test<BA, BE>,
        suite: Suite<BA, BE>,
        depth: number,
        beforeAllData: BA
    ) {
        this.reporter.startedTest(test.name, depth);

        let data: BE | undefined;
        try {
            try {
                data = await suite.hooks.beforeEach();
                try {
                    let done = false;
                    const timer = new Timer();
                    let timeoutId: ReturnType<typeof setTimeout> | undefined;
                    const timeout = new Promise((_, reject) => {
                        timeoutId = setTimeout(() => {
                            if (!done) {
                                reject(
                                    new Error(
                                        `Test "${test.name}" timed out after ${this.testTimeout}ms`
                                    )
                                );
                            }
                        }, this.testTimeout);
                    });
                    try {
                        timer.start();
                        await Promise.race([
                            test.fn(beforeAllData, data),
                            timeout,
                        ]);
                        done = true;
                        clearTimeout(timeoutId);

                        timer.stop();
                        const elapsed = timer.ms();
                        suite.passed++;
                        this.rootSuite.passed++;
                        this.reporter.passedTest(elapsed, depth + 1);
                    } catch (error: any) {
                        clearTimeout(timeoutId);
                        timer.stop();
                        error.message = `${error.message}`;
                        error.wasThrown = true;
                        throw error;
                    } finally {
                        suite.hooks.afterEach(data);
                    }
                } catch (error: any) {
                    if (error.wasThrown) throw error;
                    error.wasThrown = true;
                    error.message = `Error in after each for "${test.name}": ${error.message}`;
                    throw error;
                }
            } catch (error: any) {
                if (error.wasThrown) throw error;
                error.wasThrown = true;
                error.message = `Error in before each for "${test.name}": ${error.message}`;
                throw error;
            }
        } catch (error: any) {
            suite.failed++;
            this.rootSuite.failed++;
            this.reporter.failedTest(error, depth + 1);
        }
    }
}
