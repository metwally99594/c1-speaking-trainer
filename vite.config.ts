import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'https://c1-speaking-trainer.vercel.app',
        changeOrigin: true,
      },
    },
  },
});
