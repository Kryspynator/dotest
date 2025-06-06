import chalk from "chalk";
import type { Reporter } from "./types.ts";

const indentString = "   ";
const print = console.log;
const red = chalk.red;
const green = chalk.green;

const printRed = (message: string) => {
    print(red(message));
};

const printGreen = (message: string) => {
    print(green(message));
};

export const reporter: Reporter = {
    failedTest: (error: Error, depth: number) => {
        const indent = indentString.repeat(depth);
        printRed(`${indent}❌ Failed: ${error.message}`);
    },
    passedTest: (depth: number) => {
        const indent = indentString.repeat(depth);
        printGreen(`${indent}✅ Passed`);
    },
    startedSpec: (name: string, depth: number) => {
        const indent = indentString.repeat(depth);
        print(`${indent}📁 ${name}`);
    },
    startedTest: (name: string, depth: number) => {
        const indent = indentString.repeat(depth);
        print(`${indent}🔍 ${name}`);
    },
    info: (message: string) => {
        print(`${message}`);
    },
};
