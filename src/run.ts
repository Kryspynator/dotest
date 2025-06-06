import defaultConfig from "./default.config.ts";
import { join, extname } from "node:path";
import { existsSync } from "node:fs";
import { readdir } from "node:fs/promises";

const currentDir = process.cwd();
const configPath = join(currentDir, "dotest.config.ts");

let userConfig = defaultConfig;

if (existsSync(configPath)) {
    userConfig = await import(configPath);
}

const config = { ...defaultConfig, ...userConfig };

async function findTestFiles(dir: string, pattern: RegExp): Promise<string[]> {
    const testFiles: string[] = [];

    try {
        const entries = await readdir(dir, { withFileTypes: true });

        for (const entry of entries) {
            const fullPath = join(dir, entry.name);

            if (entry.isDirectory()) {
                // Skip node_modules and hidden directories
                if (
                    entry.name === "node_modules" ||
                    entry.name.startsWith(".")
                ) {
                    continue;
                }
                const nestedFiles = await findTestFiles(fullPath, pattern);
                testFiles.push(...nestedFiles);
            } else if (entry.isFile()) {
                // Check if file extension is .ts or .js and matches the pattern
                const ext = extname(entry.name);
                if (
                    (ext === ".ts" || ext === ".js") &&
                    pattern.test(entry.name)
                ) {
                    testFiles.push(fullPath);
                }
            }
        }
    } catch (error) {
        console.error(`Error reading directory ${dir}:`, error);
    }

    return testFiles;
}

const testFiles = await findTestFiles(currentDir, config.testNamePattern);

await Promise.all(
    testFiles.map(async (file) => {
        try {
            await import(file);
        } catch (error) {
            console.error(`Error importing test file ${file}:`, error);
        }
    })
);
