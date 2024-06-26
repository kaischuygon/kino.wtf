// vite.config.js
import { defineConfig } from 'vite'
import { resolve } from 'path'
import solid from 'vite-plugin-solid'
import Icons from 'unplugin-icons/vite'

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
      },
    },
  },
  plugins: [solid({ typescript: { onlyRemoveTypeImports: true } }), Icons({ compiler: 'solid' })],
})
