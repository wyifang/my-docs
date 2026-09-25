import { defineConfig } from 'vitepress'

// https://vitepress.vuejs.org/config/app-configs
export default defineConfig({
    title: 'Yifang Docs',
    description: 'My first VitePress documentation site',

    base: '/my-docs/',
    
    themeConfig: {
        nav: [
          { text: '首页', link: '/' },
          { text: '学习笔记', link: '/notes/' },
          { text: 'AI', link: '/ai/' },
          { text: 'AI 数据湖', link: '/ai-data-lake/' },
          { text: '关于', link: '/about/' }
        ],
        sidebar: {
          '/notes/': [
            {
              text: '学习笔记',
              items: [
                { text: '笔记总览', link: '/notes/' }
              ]
            },
            {
              text: 'Git',
              items: [
                { text: 'Git 学习笔记', link: '/notes/git/' },
                { text: '基础命令', link: '/notes/git/basic' },
                { text: '分支管理', link: '/notes/git/branch' },
                { text: '合并与冲突', link: '/notes/git/merge' },
                { text: '远程仓库', link: '/notes/git/remote' }
              ]
            },
            {
              text: 'Markdown',
              items: [
                { text: 'Markdown 学习笔记', link: '/notes/markdown/' },
                { text: '标题与段落', link: '/notes/markdown/headings-and-paragraphs' },
                { text: '文字强调', link: '/notes/markdown/text-emphasis' },
                { text: '列表', link: '/notes/markdown/lists' },
                { text: '链接', link: '/notes/markdown/links' },
                { text: '图片', link: '/notes/markdown/images' },
                { text: '代码', link: '/notes/markdown/code' },
                { text: '引用', link: '/notes/markdown/blockquotes' },
                { text: '分隔线', link: '/notes/markdown/horizontal-rules' },
                { text: '表格', link: '/notes/markdown/tables' },
                { text: '脚注', link: '/notes/markdown/footnotes' },
                { text: 'HTML与Markdown', link: '/notes/markdown/html' },
                { text: '任务列表', link: '/notes/markdown/task-lists' },
                { text: '转义字符', link: '/notes/markdown/escape' },
                { text: 'Emoji', link: '/notes/markdown/emoji' },
                { text: '数学公式', link: '/notes/markdown/math' },
                { text: '自定义容器', link: '/notes/markdown/custom-containers' },
              ]
            }
          ]
        },
        /*
        sidebar: {
          '/notes/': [
            {
              text: '学习笔记',
              items: [
                { text: '笔记首页', link: '/notes/' },
                { text: 'Git 学习笔记', link: '/notes/git/' },
                { text: 'Git 基础', link: '/notes/git/basic' },
                { text: 'Git 分支', link: '/notes/git/branch' },
                { text: 'Git 合并与冲突', link: '/notes/git/merge' },
                { text: 'Git 远程仓库和同步', link: '/notes/git/remote' },
                { text: 'Markdown 学习笔记', link: '/notes/markdown/' }
              ]
            }
          ]
        },
        */    
        outline: {
          level: [2, 3],
          label: '本页目录'
        }
        /*
        sidebar: [
          { text: '首页sidebar', link: '/' },
          { text: '学习笔记sidebar', link: '/notes/' },
          { text: 'AIsidebar', link: '/ai/' },
          { text: '关于sidebar', link: '/about/' }
        ]
        */
      }
})
