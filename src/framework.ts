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
    OptionallyAsync,
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

    createSuite(
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

    test<BeforeAllData, BeforeEachData>(
        name: string,
        fn: TestFunc<BeforeAllData, BeforeEachData>
    ) {
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

    testEach<BeforeAllData, BeforeEachData, TestCaseData>(
        name: string | ((data: TestCaseData) => string),
        testCases: TestCaseData[],
        fn: TestCaseFunc<BeforeAllData, BeforeEachData, TestCaseData>
    ) {
        if (!Array.isArray(testCases) || testCases.length === 0) {
            throw new Error(
                "test.each requires a non-empty array of test cases"
            );
        }

        const suiteName =
            typeof name === "string" ? name : "Parameterized Test";
        const suite = this.createSuite(suiteName, this.currentSuite);
        this.currentSuite.children.push(suite);
        this.currentSuite = suite;

        for (const testCase of testCases) {
            const testName =
                typeof name === "function"
                    ? name(testCase)
                    : `${name} - ${JSON.stringify(testCase)}`;

            this.test(
                testName,
                (beforeAll: BeforeAllData, beforeEach: BeforeEachData) =>
                    fn(testCase, beforeAll, beforeEach)
            );
        }
        this.currentSuite = this.currentSuite.parent || this.rootSuite;
    }

    detectNestedTests<BeforeAllData, BeforeEachData>(
        fn: TestFunc<BeforeAllData, BeforeEachData>
    ): boolean {
        let hasNested = false;
        const originalTest = this.test.bind(this);
        const originalBeforeAll = this.beforeAll.bind(this);
        const originalAfterAll = this.afterAll.bind(this);
        const originalBeforeEach = this.beforeEach.bind(this);
        const originalAfterEach = this.afterEach.bind(this);

        this.test = () => {
            hasNested = true;
        };
        this.beforeAll = () => {};
        this.afterAll = () => {};
        this.beforeEach = () => {};
        this.afterEach = () => {};

        try {
            fn();
        } catch (e) {
            hasNested = false;
        } finally {
            this.test = originalTest;
            this.beforeAll = originalBeforeAll;
            this.afterAll = originalAfterAll;
            this.beforeEach = originalBeforeEach;
            this.afterEach = originalAfterEach;
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
            toBeUndefined() {
                if (typeof actual !== "undefined") {
                    throw new Error(`Expected ${actual} to be undefined`);
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

    private async executeSuite<BeforeAllData, BeforeEachData>(
        suite: Suite<BeforeAllData, BeforeEachData>,
        depth: number
    ) {
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

    private async executeTest<BeforeAllData, BeforeEachData>(
        test: Test<BeforeAllData, BeforeEachData>,
        suite: Suite<BeforeAllData, BeforeEachData>,
        depth: number,
        beforeAllData: BeforeAllData
    ) {
        this.reporter.startedTest(test.name, depth);

        let data: BeforeEachData | undefined;
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
    suite(name: string) {
        return new SuiteBuilder(this, name);
    }

    enterSuite(name: string) {
        const suite = this.createSuite(name, this.currentSuite);
        this.currentSuite.children.push(suite);
        this.currentSuite = suite;
    }

    leaveSuite() {
        if (this.currentSuite.parent) {
            this.currentSuite = this.currentSuite.parent;
        }
    }
}



export class SuiteBuilder<BeforeAllData = unknown, BeforeEachData = unknown> {
    private beforeAllFn: BeforeFunc<any> = () => {};
    private beforeEachFn: BeforeFunc<any> = () => {};
    private afterAllFn: AfterFunc<any> = () => {};
    private afterEachFn: AfterFunc<any> = () => {};

    private dotest: Dotest;
    private suite: Suite<any, any>;

    constructor(dotest: Dotest, name: string) {
        this.dotest = dotest;
        this.suite = this.dotest.createSuite(name, this.dotest.currentSuite);
        this.dotest.currentSuite.children.push(this.suite);
    }

    beforeAll<T>(
        fn: () => OptionallyAsync<T>
    ): SuiteBuilder<BeforeAllData & T, BeforeEachData> {
        const prev = this.beforeAllFn;
        this.beforeAllFn = async () => {
            const prevData = (await prev()) || {};
            const newData = (await fn()) || {};
            return { ...prevData, ...newData };
        };
        this.suite.hooks.beforeAll = this.beforeAllFn;
        return this as any;
    }

    beforeEach<T>(
        fn: () => OptionallyAsync<T>
    ): SuiteBuilder<BeforeAllData, BeforeEachData & T> {
        const prev = this.beforeEachFn;
        this.beforeEachFn = async () => {
            const prevData = (await prev()) || {};
            const newData = (await fn()) || {};
            return { ...prevData, ...newData };
        };
        this.suite.hooks.beforeEach = this.beforeEachFn;
        return this as any;
    }

    afterAll(fn: (data: BeforeAllData) => OptionallyAsync<void>): this {
        const prev = this.afterAllFn;
        this.afterAllFn = async (data) => {
            await prev(data);
            await fn(data);
        };
        this.suite.hooks.afterAll = this.afterAllFn;
        return this;
    }

    afterEach(fn: (data: BeforeEachData) => OptionallyAsync<void>): this {
        const prev = this.afterEachFn;
        this.afterEachFn = async (data) => {
            await prev(data);
            await fn(data);
        };
        this.suite.hooks.afterEach = this.afterEachFn;
        return this;
    }

    test(name: string, fn: TestFunc<BeforeAllData, BeforeEachData>) {
        this.suite.tests.push({ name, fn });
        return this;
    }

    testEach<TestCaseData>(
        name: string | ((data: TestCaseData) => string),
        testCases: TestCaseData[],
        fn: TestCaseFunc<BeforeAllData, BeforeEachData, TestCaseData>
    ) {
        if (!Array.isArray(testCases) || testCases.length === 0) {
            throw new Error(
                "test.each requires a non-empty array of test cases"
            );
        }

        const suiteName =
            typeof name === "string" ? name : "Parameterized Test";
        const suite = this.dotest.createSuite(suiteName, this.suite);
        this.suite.children.push(suite);

        suite.hooks.beforeAll = this.beforeAllFn;
        suite.hooks.afterAll = this.afterAllFn;
        suite.hooks.beforeEach = this.beforeEachFn;
        suite.hooks.afterEach = this.afterEachFn;

        for (const testCase of testCases) {
            const testName =
                typeof name === "function"
                    ? name(testCase)
                    : `${name} - ${JSON.stringify(testCase)}`;

            suite.tests.push({
                name: testName,
                fn: (beforeAll: BeforeAllData, beforeEach: BeforeEachData) =>
                    fn(testCase, beforeAll, beforeEach),
            });
        }
        return this;
    }
}

