import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;

          if (id.includes("firebase/firestore") || id.includes("@firebase/firestore")) {
            return "vendor-firebase-firestore";
          }

          if (id.includes("firebase/auth") || id.includes("@firebase/auth")) {
            return "vendor-firebase-auth";
          }

          if (id.includes("firebase") || id.includes("@firebase")) {
            return "vendor-firebase-core";
          }

          if (id.includes("react") || id.includes("scheduler")) return "vendor-react";
          if (id.includes("dayjs") || id.includes("zod") || id.includes("react-hook-form")) {
            return "vendor-utils";
          }
        },
      },
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["vite.svg", "robots.txt"],
      manifest: {
        name: "Agenda Compartida",
        short_name: "Agenda",
        description: "Agenda colaborativa con soporte offline, alertas y reportes.",
        theme_color: "#123c69",
        background_color: "#f4f9f8",
        display: "standalone",
        start_url: "/",
        icons: [
          {
            src: "pwa-192.svg",
            sizes: "192x192",
            type: "image/svg+xml",
          },
          {
            src: "pwa-512.svg",
            sizes: "512x512",
            type: "image/svg+xml",
            purpose: "any maskable",
          },
        ],
      },
    }),
  ],
});
