import { StrictConfig } from "./types.ts";

const config: StrictConfig = {
    testTimeout: 5000,
    testNamePattern: /\.spec\.ts\.js$/,
    includeDirectories: ["tests", "src/tests"],
    excludeDirectories: ["node_modules", "dist", "build", "coverage", ".git"],
};

export default config;
