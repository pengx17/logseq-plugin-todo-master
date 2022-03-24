import reactRefresh from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import logseqPlugin from "vite-plugin-logseq";

const reactRefreshPlugin = reactRefresh();

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [reactRefreshPlugin, logseqPlugin()],
  build: {
    target: "esnext",
    minify: "esbuild",
  },
});
