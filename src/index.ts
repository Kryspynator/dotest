import type { AfterFunc, BeforeFunc, TestCaseFunc, TestFunc } from "./types.ts";
import { Dotest } from "./framework.ts";

const dotest = new Dotest();

// Exports
export type { Config } from "./types.ts";

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
