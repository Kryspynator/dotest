import { suite, expect } from "../src/index.ts";
import { Dotest } from "../src/framework.ts";
import type { Reporter } from "../src/types.ts";

class TestReporter implements Reporter {
    failed: number = 0;
    passed: number = 0;

    failedTest(error: Error, depth: number) {
        this.failed++;
    }
    passedTest(elapsed: number, depth: number) {
        this.passed++;
    }
    startedSuite(name: string, depth: number) {}
    startedTest(name: string, depth: number) {}
    startedAll() {}
    finishedSuite(
        name: string,
        depth: number,
        failed: number,
        passed: number
    ) {}
    finishedAll(failed: number, passed: number) {}
}

suite("Timeout Functionality")
    .beforeEach(() => {
        return {
            dotest: new Dotest(),
            reporter: new TestReporter(),
        };
    })
    .test(
        "should fail when test exceeds default timeout",
        async (_, { dotest, reporter }) => {
            dotest.test("slow test", async () => {
                await new Promise((resolve) => setTimeout(resolve, 200));
            });

            // Run with short timeout
            await dotest.run({ reporter, testTimeout: 100 });

            expect(reporter.passed).toBe(0);
            expect(reporter.failed).toBe(1);
        }
    )
    .test(
        "should pass when test completes within timeout",
        async (_, { dotest, reporter }) => {
            dotest.test("fast test", async () => {
                await new Promise((resolve) => setTimeout(resolve, 50));
            });

            // Run with sufficient timeout
            await dotest.run({ reporter, testTimeout: 100 });

            expect(reporter.passed).toBe(1);
            expect(reporter.failed).toBe(0);
        }
    )
    .test(
        "should use configured global timeout",
        async (_, { dotest, reporter }) => {
            // Verify default is 5000
            expect(dotest.testTimeout).toBe(5000);

            await dotest.run({ reporter, testTimeout: 1000 });

            expect(dotest.testTimeout).toBe(1000);
        }
    );
