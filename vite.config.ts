import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
    base: process.env.PAGES_BASE ?? "/eze-arrivals-pages/",
    plugins: [tailwindcss(), react()],
    build: { outDir: "dist", emptyOutDir: true },
});
