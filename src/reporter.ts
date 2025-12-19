import chalk from "chalk";
import type { Reporter } from "./types.ts";

const indentString = "   ";
const print = console.log;

let startTime = 0;
let currentTestName = "";
const failures: Array<{ name: string; error: Error }> = [];

export const defaultReporter: Reporter = {
    failedTest: (error: Error, depth: number) => {
        const indent = indentString.repeat(depth);
        print(chalk.red(`${indent}❌ Failed: ${error.message}`));
        failures.push({ name: currentTestName, error });
    },
    passedTest: (elapsed: number, depth: number) => {
        const indent = indentString.repeat(depth);
        print(chalk.green(`${indent}✅ Passed - ${elapsed}ms`));
    },
    startedSuite: (name: string, depth: number) => {
        const indent = indentString.repeat(depth);
        print(chalk.bold(`${indent}📁 ${name}`));
    },
    startedTest: (name: string, depth: number) => {
        const indent = indentString.repeat(depth);
        print(`${indent}🔍 ${name}`);
        currentTestName = name;
    },
    startedAll: () => {
        startTime = Date.now();
        failures.length = 0;
        print(chalk.bold.cyan("\n🧪 Running tests...\n"));
    },
    finishedSuite: (
        name: string,
        depth: number,
        failed: number,
        _passed: number
    ) => {
        if (depth < 0) return;
        if (failed === 0) return;
        const indent = indentString.repeat(depth);
        print(chalk.red(`${indent}❌ Failed: ${failed} tests in ${name}`));
    },
    finishedAll: (failed: number, passed: number) => {
        const duration = Date.now() - startTime;
        print("\n" + chalk.bold("🧪 Test run complete."));
        print(chalk.green(`   ✅ Passed: ${passed}`));
        print(chalk.red(`   ❌ Failed: ${failed}`));
        print(chalk.cyan(`   ⏱️  Duration: ${duration}ms`));

        if (failures.length > 0) {
            print("\n" + chalk.bold.red("Summary of Failures:"));
            failures.forEach(({ name, error }, index) => {
                print(chalk.red(`\n${index + 1}) ${name}`));
                print(chalk.gray(error.stack || error.message));
            });
        }

        if (failed > 0) {
            print(
                "\n" + chalk.bgRed.white.bold(" FAIL ") + " Some tests failed."
            );
        } else {
            print(
                "\n" +
                    chalk.bgGreen.black.bold(" PASS ") +
                    " All tests passed successfully!"
            );
        }
    },
};
