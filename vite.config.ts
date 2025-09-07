import { defineConfig } from "vite";

export default defineConfig({
    build: {
        target: "es2020",
        sourcemap: true,
        lib: {
            entry: "src/index.ts",
            name: "PKV.js",
            formats: ["es", "umd"],
            fileName: (format) => `pkv.${format}.js`
        }
    }
});
