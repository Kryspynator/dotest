import { defaultReporter } from "./reporter.ts";
import type { StrictConfig } from "./types.ts";

const config: StrictConfig = {
    testTimeout: 5000,
    testNamePattern: "\\.spec\\.ts$",
    includeDirectories: [],
    excludeDirectories: ["node_modules", "dist", "build", "coverage", ".git"],
    reporter: defaultReporter,
};

export default config;
