type OptionallyAsync<T> = T | Promise<T>;

type BeforeFunc<Data> = () => OptionallyAsync<Data>;

type AfterFunc<Data> = (data: Data) => OptionallyAsync<void>;

type TestFunc<BeforeAllData, BeforeEachData> = (
    beforeAllData: BeforeAllData,
    beforeEachData: BeforeEachData
) => OptionallyAsync<BeforeAllData & BeforeEachData> | OptionallyAsync<void>;

type TestCaseFunc<BeforeAllData, BeforeEachData, TestCaseData> = (
    beforeAllData: BeforeAllData,
    beforeEachData: BeforeEachData,
    testCaseData: TestCaseData
) => OptionallyAsync<BeforeAllData & BeforeEachData> | OptionallyAsync<void>;

type Test<BA, BE> = { name: string; fn: TestFunc<BA, BE> };

interface Suite<BA, BE> {
    name: string;
    parent: Suite<any, any> | null;
    children: Suite<any, any>[];
    tests: Test<BA, BE>[];
    beforeAll: BeforeFunc<BA>;
    afterAll: AfterFunc<BA>;
    beforeEach: BeforeFunc<BE>;
    afterEach: AfterFunc<BE>;
}

const print = console.log;

const indentString = "   ";

class Dotest {
    rootSuite: Suite<any, any>;
    currentSuite: Suite<any, any>;

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

    private async executeSuite<BA, BE>(suite: Suite<BA, BE>, depth: number) {
        const indent = indentString.repeat(Math.max(0, depth));

        if (depth >= 0) {
            print(`${indent}📁 ${suite.name}`);
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
        const indent = indentString.repeat(depth);
        print(`${indent}🔍 ${test.name}`);

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
            const indent = indentString.repeat(depth + 1);
            data = await beforeEach();
            try {
                try {
                    await test.fn(beforeAllData, data);

                    print(`${indent}✅ Passed`);
                } catch (error: any) {
                    print(`${indent}❌ Failed: ${error.message}`);
                } finally {
                    afterEach(data);
                }
            } catch (error: any) {
                print(`${indent}❌ Failed In AfterEach: ${error.message}`);
            }
        } catch (error: any) {
            console.log(`${indent}❌ Failed In BeforeEach: ${error.message}`);
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
    all: <Data>(fn: BeforeFunc<Data>) => dotest.beforeAll(fn),
    each: <Data>(fn: BeforeFunc<Data>) => dotest.beforeEach(fn),
};

export const after = {
    all: <Data>(fn: AfterFunc<Data>) => dotest.afterAll(fn),
    each: <Data>(fn: AfterFunc<Data>) => dotest.afterEach(fn),
};

export const test = Object.assign(
    <BeforeAllData, BeforeEachData>(
        name: string,
        fn: TestFunc<BeforeAllData, BeforeEachData>
    ) => dotest.test(name, fn),
    {
        each: <BeforeAllData, BeforeEachData, TestCaseData>(
            name: string,
            testCases: TestCaseData[],
            fn: TestCaseFunc<BeforeAllData, BeforeEachData, TestCaseData>
        ) => dotest.testEach(name, testCases, fn),
    }
);

export const expect = <T>(actual: T) => dotest.expect(actual);

export const run = () => dotest.run();
