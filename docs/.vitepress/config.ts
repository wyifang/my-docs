import { defineConfig } from 'vitepress'

// https://vitepress.vuejs.org/config/app-configs
export default defineConfig({
    title: 'Yifang Docs from defineConfig',
    description: 'My first VitePress documentation site',

    base: '/my-docs/',
    
    themeConfig: {
        nav: [
          { text: '首页nav', link: '/' },
          { text: '学习笔记nav', link: '/notes/' },
          { text: 'AInav', link: '/ai/' },
          { text: '关于nav', link: '/about/' }
        ],
        sidebar: [
          { text: '首页sidebar', link: '/' },
          { text: '学习笔记sidebar', link: '/notes/' },
          { text: 'AIsidebar', link: '/ai/' },
          { text: '关于sidebar', link: '/about/' }
        ]
      }
})
