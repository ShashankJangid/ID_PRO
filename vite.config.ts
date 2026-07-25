import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    port: 3000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    target: 'es2020',
    // Increase chunk warning limit since we're splitting properly
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Firebase — lazy load only when needed
          if (id.includes('firebase')) return 'firebase';
          // PDF export libs — only loaded on export
          if (id.includes('jspdf')) return 'jspdf';
          if (id.includes('html2canvas')) return 'html2canvas';
          // QR code
          if (id.includes('qrcode')) return 'qrcode';
          // React core
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) return 'react-core';
          // DnD kit
          if (id.includes('@dnd-kit')) return 'dnd-kit';
          // Icons
          if (id.includes('lucide-react')) return 'lucide';
          // Zustand
          if (id.includes('zustand')) return 'zustand';
        },
      },
    },
  },
});
