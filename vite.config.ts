import reactRefresh from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import logseqPlugin from "vite-plugin-logseq";

const reactRefreshPlugin = reactRefresh({
  fastRefresh: false,
});

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [reactRefreshPlugin, logseqPlugin()],
  clearScreen: false,
  build: {
    target: "esnext",
    minify: "esbuild",
  },
});
