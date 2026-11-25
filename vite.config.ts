import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import vueDevTools from 'vite-plugin-vue-devtools'
import viteCompression from "vite-plugin-compression";
import path from "path";
import { moduleOutDir, packageModule } from "./foundry/package-module.mjs";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const forFoundry = mode === "foundry";
  return {
    plugins: [
      vue(),
      ...(forFoundry
        ? [packageModule()]
        : [vueDevTools(), viteCompression({ algorithm: "brotliCompress" })]),
    ],
    base: "./",
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "src"),
      },
    },
    optimizeDeps: {
      include: [
        "@massif/lancer-data",
        "lancer-ktb-data",
        "lancer-nrfaw-data",
        "lancer-longrim-data"
      ],
    },
    build: {
      outDir: forFoundry ? moduleOutDir : "dist",
      sourcemap: !forFoundry,
      cssCodeSplit: true,
      reportCompressedSize: true,
    },
    json: {
      namedExports: true,
    },
    css: {
      devSourcemap: true,
    },
  };
});
