import type {
    AfterFunc,
    BeforeFunc,
    RunArgs,
    TestCaseFunc,
    TestFunc,
} from "./types.ts";
import { Dotest } from "./framework.ts";

const dotest = new Dotest();

// Exports
export type { Config, Reporter } from "./types.ts";

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
            name: string | ((data: TestCaseData) => string),
            testCases: TestCaseData[],
            fn: TestCaseFunc<BeforeAllData, BeforeEachData, TestCaseData>
        ) => dotest.testEach(name, testCases, fn),
    }
);

export const expect = <T>(actual: T) => dotest.expect(actual);

export const run = (args: RunArgs) => dotest.run(args);

export const suite = (name: string) => dotest.suite(name);

export const enterSuite = (name: string) => dotest.enterSuite(name);

export const leaveSuite = () => dotest.leaveSuite();
