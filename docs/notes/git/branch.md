# Git 分支

## 1. 什么是分支？

分支可以理解为一条独立的开发线。你可以在新分支上尝试修改，而不影响 `main` 分支上的现有内容。

例如：

* `main`：保存相对稳定的版本
* `feature`：开发新功能
* `fix-typo`：修复文档中的错别字

## 2. 常用命令

### 查看当前分支

```bash
git branch
```

当前分支前面的 `*` 表示你所在的分支。

### 创建分支

```bash
git branch feature
```

这条命令只创建分支，不会自动切换过去。

### 切换分支

```bash
git switch feature
```

### 创建并切换分支

```bash
git switch -c feature
```

### 删除本地分支

```bash
git branch -d feature
```

如果分支尚未合并，Git 可能会阻止删除。不要为了绕过提示而随意使用强制删除。

## 3. 分支的基本工作流程

```bash
# 查看当前分支
git branch

# 创建并切换到新分支
git switch -c feature

# 修改文件后，暂存并提交
git add .
git commit -m "Add feature"

# 切回 main
git switch main
```

## 4. 注意事项

* 切换分支时，未提交的修改可能会影响切换；遇到提示时先检查工作区状态。
* 分支是轻量的开发指针，不是文件夹的完整复制。
* 本地创建的分支不会自动出现在 GitHub 上；需要推送后，远程仓库才能看到它。
