import defaultConfig from "./default.config.ts";
import { join } from "node:path";
import { existsSync } from "node:fs";
import { readdir } from "node:fs/promises";
import { run } from "./index.ts";
import { pathToFileURL } from "node:url";

const currentDir = process.cwd();

const configPath = join(currentDir, "dotest.config.ts");

let userConfig = defaultConfig;

if (existsSync(configPath)) {
    userConfig = (await import(pathToFileURL(configPath).href)).default;
}

const { excludeDirectories, includeDirectories, testNamePattern } = {
    ...defaultConfig,
    ...userConfig,
};

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
                    !includeDirectories.some((dir) =>
                        RegExp(dir).test(entry.name)
                    )
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

await Promise.all(
    testFiles.map(async (file) => {
        try {
            await import(pathToFileURL(file).href);
        } catch (error) {
            console.error(`Error importing test file ${file}:`, error);
        }
    })
);

run();
