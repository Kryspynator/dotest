import { Dotest } from "../src/framework.ts";
import { suite, expect } from "../src/index.ts";
import type { Reporter } from "../src/index.ts";

class RetryReporter implements Reporter {
    failed: number = 0;
    passed: number = 0;
    attempts: number = 0;

    failedTest(_error: Error, _depth: number) {
        this.failed++;
    }
    passedTest(_elapsed: number, _depth: number) {
        this.passed++;
    }
    startedSuite(_name: string, _depth: number) {}
    startedTest(_name: string, _depth: number) {
        this.attempts++;
    }
    startedAll() {}
    finishedSuite(
        _name: string,
        _depth: number,
        _failed: number,
        _passed: number
    ) {}
    finishedAll(_failed: number, _passed: number) {}
}

suite("Retry Mechanism")
    .test(
        "should retry failed test the specified number of times",
        async () => {
            const dotest = new Dotest();
            const reporter = new RetryReporter();
            let runs = 0;

            dotest.test("flaky test", () => {
                runs++;
                if (runs < 3) {
                    throw new Error("Temporary failure");
                }
            });

            // 2 retries means 3 attempts total
            await dotest.run({
                reporters: [reporter],
                testTimeout: 1000,
                retries: 2,
            });

            expect(runs).toBe(3);
            expect(reporter.passed).toBe(1);
            expect(reporter.failed).toBe(0);
            expect(reporter.attempts).toBe(1); // startedTest is called once per test logically, but maybe I should call it per attempt?
            // Actually, in my implementation startedTest is called BEFORE the loop.
        }
    )
    .test("should fail after all retries are exhausted", async () => {
        const dotest = new Dotest();
        const reporter = new RetryReporter();
        let runs = 0;

        dotest.test("always failing test", () => {
            runs++;
            throw new Error("Permanent failure");
        });

        // 1 retry means 2 attempts total
        await dotest.run({
            reporters: [reporter],
            testTimeout: 1000,
            retries: 1,
        });

        expect(runs).toBe(2);
        expect(reporter.passed).toBe(0);
        expect(reporter.failed).toBe(1);
    });
