import defaultConfig from "./default.config.ts";
import { join, relative } from "node:path";
import { existsSync } from "node:fs";
import { readdir } from "node:fs/promises";
import { enterSuite, leaveSuite, run } from "./index.ts";
import { pathToFileURL } from "node:url";

const currentDir = process.cwd();

const configPath = join(currentDir, "dotest.config.ts");

let userConfig = defaultConfig;

if (existsSync(configPath)) {
    userConfig = (await import(pathToFileURL(configPath).href)).default;
}

const {
    excludeDirectories,
    includeDirectories,
    testNamePattern: configPattern,
    reporters,
    testTimeout: configTimeout,
    retries: configRetries,
} = {
    ...defaultConfig,
    ...userConfig,
};

// Simple CLI Argument Parsing
const args = process.argv.slice(2);
let testTimeout = configTimeout;
let retries = configRetries;
let testNamePattern = configPattern;

for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--timeout" || arg === "-t") {
        testTimeout = parseInt(args[++i], 10);
    } else if (arg === "--retries" || arg === "-r") {
        retries = parseInt(args[++i], 10);
    } else if (arg === "--pattern" || arg === "-p") {
        testNamePattern = args[++i];
    }
}

async function findTestFiles(dir: string, pattern: string): Promise<string[]> {
    const testFiles: string[] = [];
    const regexPattern = new RegExp(pattern);

    try {
        const entries = await readdir(dir, { withFileTypes: true });

        for (const entry of entries) {
            const fullPath = join(dir, entry.name);

            if (entry.isDirectory()) {
                if (
                    excludeDirectories.some((dir) =>
                        RegExp(dir).test(entry.name)
                    ) ||
                    (includeDirectories.length &&
                        !includeDirectories.some((dir) =>
                            RegExp(dir).test(entry.name)
                        ))
                )
                    continue;

                const nestedFiles = await findTestFiles(fullPath, pattern);
                testFiles.push(...nestedFiles);
            } else if (entry.isFile() && regexPattern.test(entry.name)) {
                testFiles.push(fullPath);
                console.log(`Found test file: ${fullPath}`);
            }
        }
    } catch (error) {
        console.error(`Error reading directory ${dir}:`, error);
    }

    return testFiles;
}

const testFiles = await findTestFiles(currentDir, testNamePattern);

for (const file of testFiles) {
    const relativePath = relative(currentDir, file);
    enterSuite(relativePath);
    try {
        await import(pathToFileURL(file).href);
    } catch (error) {
        console.error(`Error importing test file ${file}:`, error);
    }
    leaveSuite();
}

run({ reporters: reporters, testTimeout, retries });
