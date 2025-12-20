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

export interface TestMember<BeforeAllData, BeforeEachData> {
    type: "test";
    name: string;
    fn: TestFunc<BeforeAllData, BeforeEachData>;
}

export interface SubsuiteMember<BeforeAllData, BeforeEachData> {
    type: "suite";
    suite: Suite<any, any>;
    fn?: (
        subsuite: BeforeAllStage<BeforeAllData, BeforeEachData>,
        beforeAllData: BeforeAllData,
        beforeEachData: BeforeEachData
    ) => void;
}

export type SuiteMember<BeforeAllData, BeforeEachData> =
    | TestMember<BeforeAllData, BeforeEachData>
    | SubsuiteMember<BeforeAllData, BeforeEachData>;

export interface Suite<BeforeAllData, BeforeEachData> {
    name: string;
    parent: Suite<any, any> | null;
    members: SuiteMember<BeforeAllData, BeforeEachData>[];
    hooks: Hooks<BeforeAllData, BeforeEachData>;
    failed: number;
    passed: number;
}

export interface BeforeAllStage<
    BeforeAllData,
    BeforeEachData,
> extends BeforeEachStage<BeforeAllData, BeforeEachData> {
    beforeAll<T>(
        fn: () => OptionallyAsync<T>
    ): BeforeAllStage<BeforeAllData & T, BeforeEachData>;
}

export interface BeforeEachStage<
    BeforeAllData,
    BeforeEachData,
> extends TestStage<BeforeAllData, BeforeEachData> {
    beforeEach<T>(
        fn: () => OptionallyAsync<T>
    ): BeforeEachStage<BeforeAllData, BeforeEachData & T>;
}

export interface TestStage<
    BeforeAllData,
    BeforeEachData,
> extends AfterEachStage<BeforeAllData, BeforeEachData> {
    test(
        name: string,
        fn: TestFunc<BeforeAllData, BeforeEachData>
    ): TestStage<BeforeAllData, BeforeEachData>;
    testEach<TestCaseData>(
        name: string | ((data: TestCaseData) => string),
        testCases: TestCaseData[],
        fn: TestCaseFunc<BeforeAllData, BeforeEachData, TestCaseData>
    ): TestStage<BeforeAllData, BeforeEachData>;
    subsuite(
        name: string,
        fn: (
            subsuite: BeforeAllStage<BeforeAllData, BeforeEachData>,
            beforeAll: BeforeAllData,
            beforeEach: BeforeEachData
        ) => void
    ): TestStage<BeforeAllData, BeforeEachData>;
}

export interface AfterEachStage<
    BeforeAllData,
    BeforeEachData,
> extends AfterAllStage<BeforeAllData, BeforeEachData> {
    afterEach(
        fn: (data: BeforeEachData) => OptionallyAsync<void>
    ): AfterEachStage<BeforeAllData, BeforeEachData>;
}

export interface AfterAllStage<BeforeAllData, BeforeEachData> {
    afterAll(
        fn: (data: BeforeAllData) => OptionallyAsync<void>
    ): AfterAllStage<BeforeAllData, BeforeEachData>;
}
