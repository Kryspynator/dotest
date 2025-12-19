export type Prettify<T> = {
    [K in keyof T]: T[K];
} & {};

export interface Reporter {
    failedTest: (error: Error, depth: number) => void;
    passedTest: (elapsed: number, depth: number) => void;
    startedSuite: (name: string, depth: number) => void;
    startedTest: (name: string, depth: number) => void;
    startedAll: () => void;
    finishedSuite: (
        name: string,
        depth: number,
        failed: number,
        passed: number
    ) => void;
    finishedAll: (failed: number, passed: number) => void;
}

export interface RunArgs {
    reporters: Reporter[];
    testTimeout: number;
    retries: number;
}

export interface StrictConfig {
    /**
     * The maximum time in milliseconds to wait for a test to complete.
     * If a test exceeds this time, it will be marked as failed.
     */
    testTimeout: number;
    /**
     * A regex pattern to match test names against.
     * If provided, only tests with names matching this pattern will be executed.
     * Useful for filtering tests based on naming conventions.
     */
    testNamePattern: string;
    /**
     * An array of directory names to include when searching for test files.
     * If not provided, defaults to an empty array, meaning all directories will be included.
     */
    includeDirectories: string[];
    /**
     * An array of directory names to exclude when searching for test files.
     * If not provided, defaults to an empty array, meaning no directories will be excluded.
     */
    excludeDirectories: string[];

    /**
     * The number of times to retry a failed test.
     */
    retries: number;
    /**
     * The reporter to use for logging test results.
     * This should implement the Reporter interface.
     */
    reporters: Reporter[];
}

export type Config = Prettify<Partial<StrictConfig>>;

export type OptionallyAsync<T> = T | Promise<T>;

export type BeforeFunc<Data> = () => OptionallyAsync<Data>;

export type AfterFunc<Data> = (data: Data) => OptionallyAsync<void>;

export type TestFunc<BeforeAllData, BeforeEachData> = (
    beforeAllData: BeforeAllData,
    beforeEachData: BeforeEachData
) => OptionallyAsync<BeforeAllData & BeforeEachData> | OptionallyAsync<void>;

export type TestCaseFunc<BeforeAllData, BeforeEachData, TestCaseData> = (
    testCaseData: TestCaseData,
    beforeAllData: BeforeAllData,
    beforeEachData: BeforeEachData
) => OptionallyAsync<BeforeAllData & BeforeEachData> | OptionallyAsync<void>;

export type Test<BeforeAllData, BeforeEachData> = {
    name: string;
    fn: TestFunc<BeforeAllData, BeforeEachData>;
};

export interface Hooks<BeforeAllData, BeforeEachData> {
    beforeAll: BeforeFunc<BeforeAllData>;
    afterAll: AfterFunc<BeforeAllData>;
    beforeEach: BeforeFunc<BeforeEachData>;
    afterEach: AfterFunc<BeforeEachData>;
}

export type HookVariants = Prettify<keyof Hooks<any, any>>;

export interface Suite<BeforeAllData, BeforeEachData> {
    name: string;
    parent: Suite<any, any> | null;
    children: Suite<any, any>[];
    tests: Test<BeforeAllData, BeforeEachData>[];
    hooks: Hooks<BeforeAllData, BeforeEachData>;
    failed: number;
    passed: number;
}
