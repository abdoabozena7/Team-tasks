import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

const repoBasePath = "/Team-tasks";

export default defineConfig({
  base: `${repoBasePath}/`,
  plugins: [
    tanstackStart({
      router: {
        basepath: repoBasePath,
      },
      pages: [{ path: "/" }],
      prerender: {
        enabled: true,
        autoStaticPathsDiscovery: false,
        crawlLinks: false,
      },
      sitemap: {
        enabled: false,
      },
    }),
    react(),
    tailwindcss(),
    tsconfigPaths(),
  ],
});
