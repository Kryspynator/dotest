import { Timer } from "timer-node";
import { defaultReporter } from "./reporter.ts";
import { expect as expectModule } from "./expect.ts";
import type {
    AfterFunc,
    BeforeFunc,
    Reporter,
    RunArgs,
    Suite,
    SubsuiteMember,
    TestCaseFunc,
    TestFunc,
    OptionallyAsync,
    BeforeAllStage,
    BeforeEachStage,
    TestStage,
    AfterEachStage,
    AfterAllStage,
} from "./types.ts";

export class Dotest {
    rootSuite: Suite<any, any>;
    currentSuite: Suite<any, any>;
    reporters: Reporter[] = [defaultReporter];
    testTimeout: number = 5000;
    retries: number = 0;

    constructor() {
        this.rootSuite = this.createSuite("root", null);
        this.currentSuite = this.rootSuite;
    }

    createSuite(name: string, parent: Suite<any, any> | null): Suite<any, any> {
        return {
            name,
            parent,
            members: [],
            hooks: {
                beforeAll: () => ({}) as any,
                afterAll: () => Promise.resolve(),
                beforeEach: () => ({}) as any,
                afterEach: () => Promise.resolve(),
            },
            failed: 0,
            passed: 0,
        };
    }

    test<BeforeAllData, BeforeEachData>(
        name: string,
        fn: TestFunc<BeforeAllData, BeforeEachData>
    ) {
        this.currentSuite.members.push({ type: "test", name, fn });
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
        this.currentSuite.members.push({ type: "suite", suite });
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
        return expectModule(actual);
    }

    async run({ reporters, testTimeout, retries }: RunArgs) {
        this.reporters = reporters;
        this.testTimeout = testTimeout;
        this.retries = retries;

        this.reporters.forEach((reporter) => reporter.startedAll());

        await this.executeSuite(this.rootSuite, -1, {}, {});

        this.reporters.forEach((reporter) =>
            reporter.finishedAll(this.rootSuite.failed, this.rootSuite.passed)
        );
    }

    private async executeSuite<BeforeAllData, BeforeEachData>(
        suite: Suite<BeforeAllData, BeforeEachData>,
        _depth: number,
        accumulatedBeforeAllData: any,
        accumulatedBeforeEachData: any
    ) {
        if (_depth >= 0) {
            this.reporters.forEach((reporter) =>
                reporter.startedSuite(suite.name, _depth)
            );
        }

        const suiteBeforeAllData = (await suite.hooks.beforeAll()) || {};
        const currentBeforeAllData = {
            ...accumulatedBeforeAllData,
            ...suiteBeforeAllData,
        };

        for (const member of suite.members) {
            let suiteBeforeEachData;
            try {
                suiteBeforeEachData = (await suite.hooks.beforeEach()) || {};
                const currentBeforeEachData = {
                    ...accumulatedBeforeEachData,
                    ...suiteBeforeEachData,
                };
                if (member.type === "test") {
                    await this.executeTest(
                        member,
                        suite,
                        _depth + 1,
                        currentBeforeAllData,
                        currentBeforeEachData
                    );
                } else {
                    if (member.fn) {
                        const subsuiteBuilder = new SuiteBuilder(
                            this,
                            member.suite.name,
                            suite,
                            member.suite
                        );

                        (member as SubsuiteMember<any, any>).fn!(
                            subsuiteBuilder as any,
                            currentBeforeAllData,
                            currentBeforeEachData
                        );
                    }
                    await this.executeSuite(
                        member.suite,
                        _depth + 1,
                        currentBeforeAllData,
                        currentBeforeEachData
                    );
                }
            } catch (error: any) {
                // Handle hook failures
                suite.failed++;
                this.rootSuite.failed++;
                this.reporters.forEach((reporter) =>
                    reporter.failedTest(error, _depth + 1)
                );
            } finally {
                await suite.hooks.afterEach(suiteBeforeEachData as any);
            }
        }

        await suite.hooks.afterAll(suiteBeforeAllData as any);
        this.reporters.forEach((reporter) =>
            reporter.finishedSuite(
                suite.name,
                _depth,
                suite.failed,
                suite.passed
            )
        );
    }

    private async executeTest<BeforeAllData, BeforeEachData>(
        test: { name: string; fn: TestFunc<BeforeAllData, BeforeEachData> },
        suite: Suite<BeforeAllData, BeforeEachData>,
        _depth: number,
        beforeAllData: BeforeAllData,
        beforeEachData: BeforeEachData
    ) {
        this.reporters.forEach((reporter) =>
            reporter.startedTest(test.name, _depth)
        );

        let attempts = 0;
        const maxAttempts = this.retries + 1;

        while (attempts < maxAttempts) {
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
                        test.fn(beforeAllData, beforeEachData),
                        timeout,
                    ]);
                    done = true;
                    clearTimeout(timeoutId);

                    timer.stop();
                    const elapsed = timer.ms();
                    suite.passed++;
                    this.rootSuite.passed++;
                    this.reporters.forEach((reporter) =>
                        reporter.passedTest(elapsed, _depth + 1)
                    );
                    return; // Test passed, exit retry loop
                } catch (error: any) {
                    clearTimeout(timeoutId);
                    timer.stop();
                    error.message = `${error.message}`;
                    error.wasThrown = true;
                    throw error;
                }
            } catch (error: any) {
                attempts++;
                if (attempts >= maxAttempts) {
                    suite.failed++;
                    this.rootSuite.failed++;
                    this.reporters.forEach((reporter) =>
                        reporter.failedTest(error, _depth + 1)
                    );
                }
            }
        }
    }
    suite(name: string): BeforeAllStage<unknown, unknown> {
        return new SuiteBuilder(this, name) as any;
    }

    enterSuite(name: string) {
        const suite = this.createSuite(name, this.currentSuite);
        this.currentSuite.members.push({ type: "suite", suite });
        this.currentSuite = suite;
    }

    leaveSuite() {
        if (this.currentSuite.parent) {
            this.currentSuite = this.currentSuite.parent;
        }
    }
}

export class SuiteBuilder<BeforeAllData = unknown, BeforeEachData = unknown>
    implements
        BeforeAllStage<BeforeAllData, BeforeEachData>,
        BeforeEachStage<BeforeAllData, BeforeEachData>,
        TestStage<BeforeAllData, BeforeEachData>,
        AfterEachStage<BeforeAllData, BeforeEachData>,
        AfterAllStage<BeforeAllData, BeforeEachData>
{
    private beforeAllFn: BeforeFunc<any> = () => {};
    private beforeEachFn: BeforeFunc<any> = () => {};
    private afterAllFn: AfterFunc<any> = () => {};
    private afterEachFn: AfterFunc<any> = () => {};

    private dotest: Dotest;
    private suite: Suite<any, any>;

    constructor(
        dotest: Dotest,
        name: string,
        parentSuite?: Suite<any, any>,
        existingSuite?: Suite<any, any>
    ) {
        this.dotest = dotest;
        if (existingSuite) {
            this.suite = existingSuite;
        } else {
            const parent = parentSuite || this.dotest.currentSuite;
            this.suite = this.dotest.createSuite(name, parent);
            if (parent) {
                parent.members.push({ type: "suite", suite: this.suite });
            }
        }
    }

    beforeAll<T>(
        fn: () => OptionallyAsync<T>
    ): BeforeAllStage<BeforeAllData & T, BeforeEachData> {
        const prev = this.suite.hooks.beforeAll;
        this.suite.hooks.beforeAll = async () => {
            const prevData = (await prev()) || {};
            const newData = (await fn()) || {};
            return { ...prevData, ...newData };
        };
        return this as unknown as BeforeAllStage<
            BeforeAllData & T,
            BeforeEachData
        >;
    }

    beforeEach<T>(
        fn: () => OptionallyAsync<T>
    ): BeforeEachStage<BeforeAllData, BeforeEachData & T> {
        const prev = this.suite.hooks.beforeEach;
        this.suite.hooks.beforeEach = async () => {
            const prevData = (await prev()) || {};
            const newData = (await fn()) || {};
            return { ...prevData, ...newData };
        };
        return this as unknown as BeforeEachStage<
            BeforeAllData,
            BeforeEachData & T
        >;
    }

    afterAll(
        fn: (data: BeforeAllData) => OptionallyAsync<void>
    ): AfterAllStage<BeforeAllData, BeforeEachData> {
        const prev = this.suite.hooks.afterAll;
        this.suite.hooks.afterAll = async (data) => {
            await prev(data);
            await fn(data);
        };
        return this as any;
    }

    afterEach(
        fn: (data: BeforeEachData) => OptionallyAsync<void>
    ): AfterEachStage<BeforeAllData, BeforeEachData> {
        const prev = this.suite.hooks.afterEach;
        this.suite.hooks.afterEach = async (data) => {
            await prev(data);
            await fn(data);
        };
        return this as any;
    }

    test(
        name: string,
        fn: TestFunc<BeforeAllData, BeforeEachData>
    ): TestStage<BeforeAllData, BeforeEachData> {
        this.suite.members.push({ type: "test", name, fn });
        return this as any;
    }

    subsuite(
        name: string,
        fn: (
            subsuite: BeforeAllStage<BeforeAllData, BeforeEachData>,
            beforeAll: BeforeAllData,
            beforeEach: BeforeEachData
        ) => void
    ): TestStage<BeforeAllData, BeforeEachData> {
        if (fn.length > 1) {
            const subsuite = this.dotest.createSuite(name, this.suite);
            this.suite.members.push({
                type: "suite",
                suite: subsuite,
                fn: fn as any,
            });
        } else {
            const subsuiteBuilder = new SuiteBuilder<
                BeforeAllData,
                BeforeEachData
            >(this.dotest, name, this.suite);

            fn(subsuiteBuilder, undefined as any, undefined as any);
        }
        return this as unknown as TestStage<BeforeAllData, BeforeEachData>;
    }

    testEach<TestCaseData>(
        name: string | ((data: TestCaseData) => string),
        testCases: TestCaseData[],
        fn: TestCaseFunc<BeforeAllData, BeforeEachData, TestCaseData>
    ): TestStage<BeforeAllData, BeforeEachData> {
        if (!Array.isArray(testCases) || testCases.length === 0) {
            throw new Error(
                "test.each requires a non-empty array of test cases"
            );
        }

        const suiteName =
            typeof name === "string" ? name : "Parameterized Test";
        const suite = this.dotest.createSuite(suiteName, this.suite);
        this.suite.members.push({ type: "suite", suite });

        suite.hooks.beforeAll = this.suite.hooks.beforeAll;
        suite.hooks.afterAll = this.suite.hooks.afterAll;
        suite.hooks.beforeEach = this.suite.hooks.beforeEach;
        suite.hooks.afterEach = this.suite.hooks.afterEach;

        for (const testCase of testCases) {
            const testName =
                typeof name === "function"
                    ? name(testCase)
                    : `${name} - ${JSON.stringify(testCase)}`;

            suite.members.push({
                type: "test",
                name: testName,
                fn: (beforeAll: BeforeAllData, beforeEach: BeforeEachData) =>
                    fn(testCase, beforeAll, beforeEach),
            });
        }
        return this as any;
    }
}
