import { defineConfig } from 'vitepress'

// https://vitepress.vuejs.org/config/app-configs
export default defineConfig({
    title: 'Yifang Docs',
    description: 'My first VitePress documentation site',
    themeConfig: {
        nav: [
          { text: '首页', link: '/' },
          { text: '学习笔记', link: '/notes/' },
          { text: 'AI', link: '/ai/' },
          { text: '关于', link: '/about/' }
        ]
      }
})
