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

export const defaultReporter: Reporter = {
    failedTest: (error: Error, depth: number) => {
        const indent = indentString.repeat(depth);
        printRed(`${indent}❌ Failed: ${error.message}`);
    },
    passedTest: (elapsed: number, depth: number) => {
        const indent = indentString.repeat(depth);
        printGreen(`${indent}✅ Passed - ${elapsed}ms`);
    },
    startedSuite: (name: string, depth: number) => {
        const indent = indentString.repeat(depth);
        print(`${indent}📁 ${name}`);
    },
    startedTest: (name: string, depth: number) => {
        const indent = indentString.repeat(depth);
        print(`${indent}🔍 ${name}`);
    },
    startedAll: () => {
        print("🧪 Running tests...\n");
    },
    finishedSuite: (
        name: string,
        depth: number,
        failed: number,
        _passed: number
    ) => {
        if (depth < 0) return;
        const indent = indentString.repeat(depth);
        if (failed === 0) return;
        printRed(`${indent}❌ Failed: ${failed}`);
    },
    finishedAll: (failed: number, passed: number) => {
        print("\n🧪 Test run complete.");
        printGreen(`✅ Passed: ${passed}`);
        printRed(`❌ Failed: ${failed}`);
        if (failed > 0) {
            printRed(
                "Some tests failed. Please check the output above for details."
            );
        } else {
            printGreen("All tests passed successfully!");
        }
    },
};
