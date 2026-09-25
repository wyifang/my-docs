---
prev: false
next:
  text: Git 分支
  link: /notes/git/branch
---
# Git 基础

## Git 的三个工作区域

Git 的日常工作可以先理解为三个区域：

1. **工作区（Working Tree）**：正在编辑的项目文件。
2. **暂存区（Staging Area）**：准备纳入下一次提交的修改。
3. **本地仓库（Repository）**：已经提交、由 Git 记录的版本历史。

## 常见工作流程

```text
编辑文件
   ↓
git add
   ↓
暂存区
   ↓
git commit
   ↓
本地仓库
   ↓
git push
   ↓
远端仓库（GitHub）
```

## 常用命令

| 命令 | 用途 |
|---|---|
| `git status` | 查看当前状态 |
| `git add <文件>` | 将文件修改放入暂存区 |
| `git commit -m "说明"` | 创建提交 |
| `git log --oneline` | 简洁查看提交历史 |
| `git push` | 推送提交到远端 |

## 记忆要点

- `git add` 是选择要提交的修改。
- `git commit` 是在本地创建提交。
- `git push` 是把本地提交推送到远端。


<!--
在 Markdown 正文末尾添加下面的 Frontmatter 配置时，
请注意：Frontmatter 必须放在文件最开头的 --- 区域中。
-->