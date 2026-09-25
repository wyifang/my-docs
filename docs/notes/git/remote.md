# Git 远程仓库与同步
[[toc]]

## 1. 什么是远程仓库？

远程仓库是托管在另一台服务器上的 Git 仓库。例如，GitHub 上的 `wyifang/my-docs` 就是一个远程仓库。

本地仓库和远程仓库是相互独立的：

* 本地提交保存在自己的电脑上。
* 远程提交保存在 GitHub 上。
* `push` 将本地提交推送到远程仓库。
* `fetch` 获取远程更新，但不自动合并到当前分支。
* `pull` 获取远程更新，并尝试整合到当前分支。

## 2. 查看远程仓库

```bash
git remote -v
```

查看远程仓库名称和地址。常见的远程名称是 `origin`。

## 3. 推送本地提交

```bash
git push
```

把当前分支的本地提交推送到已配置的上游分支。

首次推送新分支时，通常需要：

```bash
git push -u origin feature
```

`-u` 会设置上游分支，之后可以直接使用 `git push`。

## 4. 获取远程更新：fetch

```bash
git fetch origin
```

从 `origin` 获取远程仓库的新提交和引用信息，但不会自动把它们合并到当前分支。

获取后，可以查看提交历史：

```bash
git log --oneline --graph --decorate --all
```

## 5. 获取并整合更新：pull

```bash
git pull
```

通常相当于先获取远程更新，再将其整合到当前分支。具体整合方式可能受 Git 配置影响，例如使用 merge 或 rebase。

## 6. 一个常见同步流程

```bash
# 查看工作区状态
git status

# 获取远程更新
git fetch origin

# 查看本地与远程分支的提交情况
git log --oneline --graph --decorate --all

# 将远程更新整合到当前分支
git pull

# 推送本地提交
git push
```

实际操作时，请根据当前分支和工作区状态选择命令，不必机械地每次执行全部步骤。

## 7. 常见问题

### 为什么 push 被拒绝？

常见原因是远程分支有本地尚未包含的提交。先用 `git fetch` 获取更新，检查提交历史，再决定如何整合。

### fetch 和 pull 有什么区别？

`fetch` 只获取远程信息；`pull` 还会尝试整合更新到当前分支。

### 本地 commit 后，GitHub 会立刻更新吗？

不会。提交默认只保存在本地；需要成功执行 `git push`，远程仓库才会收到这些提交。

## 8. 小提示

::: tip 记住这个区别
`fetch` 获取远程更新，但不自动整合到当前分支；`pull` 获取后还会尝试整合。
:::

::: warning 操作前先检查
执行 `pull` 或切换分支前，先运行 `git status`，确认工作区状态。
:::

::: danger 谨慎使用
不要在不了解影响的情况下，使用强制推送或强制删除分支的命令。
:::

