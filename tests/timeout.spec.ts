import { suite, expect } from "../src/index.ts";
import { Dotest } from "../src/framework.ts";
import type { Reporter } from "../src/index.ts";

class TestReporter implements Reporter {
    failed = 0;
    passed = 0;

    failedTest(_error: Error, _depth: number) {
        this.failed++;
    }
    passedTest(_elapsed: number, _depth: number) {
        this.passed++;
    }
    startedSuite(_name: string, _depth: number) {}
    startedTest(_name: string, _depth: number) {}
    startedAll() {}
    finishedSuite(
        _name: string,
        _depth: number,
        _failed: number,
        _passed: number
    ) {}
    finishedAll(_failed: number, _passed: number) {}
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

            await dotest.run({
                reporters: [reporter],
                testTimeout: 100,
                retries: 0,
            });

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

            await dotest.run({
                reporters: [reporter],
                testTimeout: 100,
                retries: 0,
            });

            expect(reporter.passed).toBe(1);
            expect(reporter.failed).toBe(0);
        }
    )
    .test(
        "should use configured global timeout",
        async (_, { dotest, reporter }) => {
            expect(dotest.testTimeout).toBe(5000);

            await dotest.run({
                reporters: [reporter],
                testTimeout: 1000,
                retries: 0,
            });

            expect(dotest.testTimeout).toBe(1000);
        }
    );
