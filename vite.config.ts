import reactRefresh from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import logseqPlugin from "vite-plugin-logseq";

const reactRefreshPlugin = reactRefresh();

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [reactRefreshPlugin, logseqPlugin()],
  base: "",
  clearScreen: false,
  // Makes HMR available for development
  server: {
    cors: true,
    host: "localhost",
    hmr: {
      host: "localhost",
    },
    port: 4567,
    strictPort: true,
  },
  build: {
    target: "esnext",
    minify: "esbuild",
  },
});
