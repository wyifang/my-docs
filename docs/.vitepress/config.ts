import { defineConfig } from 'vitepress'

// https://vitepress.vuejs.org/config/app-configs
export default defineConfig({
    title: 'Yifang Docs',
    description: 'My first VitePress documentation site',

    base: '/my-docs/',
    
    themeConfig: {
        outline: {
          level: [2, 3],
          label: '本页目录'
        },
        nav:[
          { text: '首页', link: '/' },
          { text: '学习笔记', link: '/notes/' },
          { text: 'AI', link: '/ai/' },
          { text: '项目', link: '/products/' },
          { text: '关于', link: '/about/' },
          { text: 'API 开发项目', link: '/maas-api-lab'},
          { text: 'API Reference', link: 'https://wyifang.github.io/my-docs/api-reference.html'}
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
              ]
            }
          ],
          '/ai/': [
            {
              text: 'AI 学习中心',
              items: [
                { text: 'AI 总览', link: '/ai/' },
                { text: '知识地图', link: '/ai/knowledge-map' }
              ]
            },
            {
              text: 'Prompt Engineering',
              items: [
                { text: '提示词工程入门', link: '/ai/prompt/' }
              ]
            },
            {
              text: 'RAG',
              items: [
                { text: 'RAG 入门', link: '/ai/rag/' }
              ]
            },
            {
              text: 'MCP',
              items: [
                { text: 'MCP 入门', link: '/ai/mcp/' }
              ]
            },
            {
              text: 'Agent',
              items: [
                { text: 'Agent 入门', link: '/ai/agent/' }
              ]
            },         
            {
              text: 'AI 数据基础设施',
              items: [
                { text: '数据基础设施入门', link: '/ai/data-infrastructure/' }
              ]
            }
          ]
        },
      }
})
