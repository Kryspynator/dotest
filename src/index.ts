import type { RunArgs } from "./types.ts";
import { Dotest } from "./framework.ts";
const dotest = new Dotest();

// Exports
export type { Config, Reporter } from "./types.ts";

export const expect = <T>(actual: T) => dotest.expect(actual);

export const run = (args: RunArgs) => dotest.run(args);

export const suite = (name: string) => dotest.suite(name);

export const enterSuite = (name: string) => dotest.enterSuite(name);

export const leaveSuite = () => dotest.leaveSuite();

