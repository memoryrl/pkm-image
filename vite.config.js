import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/graphql': {
        target: 'https://beta.pokeapi.co',
        changeOrigin: true,
        rewrite: () => '/graphql/v1beta',
      },
    },
  },
});
