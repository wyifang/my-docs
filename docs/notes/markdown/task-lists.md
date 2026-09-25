# 任务列表

Markdown 可以创建带复选框的任务列表。

## 1. 未完成任务

### Markdown 源码

```
- [ ] 学习 Markdown
- [ ] 学习 Git
- [ ] 学习 VitePress
```

### 实际效果

* [ ] 学习 Markdown
* [ ] 学习 Git
* [ ] 学习 VitePress

这里：

```
[ ]
```

表示一个**未完成的任务**。

---

## 2. 已完成任务

### Markdown 源码

```
- [x] 安装 Node.js
- [x] 创建 VitePress 项目
- [x] 创建 GitHub 仓库
```

### 实际效果

* [x] 安装 Node.js
* [x] 创建 VitePress 项目
* [x] 创建 GitHub 仓库

这里：

```
[x]
```

表示一个**已完成的任务**。

`x` 也可以写成大写：

```
[X]
```

---

## 3. 未完成和已完成混合

### Markdown 源码

```
- [x] 安装 Node.js
- [x] 创建 VitePress 项目
- [ ] 学习 Markdown
- [ ] 学习 GitHub Actions
```

### 实际效果

* [x] 安装 Node.js
* [x] 创建 VitePress 项目
* [ ] 学习 Markdown
* [ ] 学习 GitHub Actions

这样就可以很直观地看到哪些事情已经完成，哪些事情还没有完成。

---

## 4. 和普通列表有什么区别？

普通无序列表：

```
- 学习 Markdown
- 学习 Git
- 学习 VitePress
```

实际效果：

* 学习 Markdown
* 学习 Git
* 学习 VitePress

任务列表：

```
- [ ] 学习 Markdown
- [ ] 学习 Git
- [ ] 学习 VitePress
```

实际效果：

* [ ] 学习 Markdown
* [ ] 学习 Git
* [ ] 学习 VitePress

区别就是：

```
[ ]
```

任务列表多了一个复选框。

---

## 5. 实际应用：学习进度

我们可以用任务列表记录 Markdown 的学习进度。

### Markdown 源码

```
## Markdown 学习进度

- [x] 标题与段落
- [x] 文字强调
- [x] 列表
- [x] 链接
- [x] 图片
- [x] 代码
- [x] 引用
- [x] 分隔线
- [x] 表格
- [ ] 任务列表
```

### 实际效果

## Markdown 学习进度

* [x] 标题与段落
* [x] 文字强调
* [x] 列表
* [x] 链接
* [x] 图片
* [x] 代码
* [x] 引用
* [x] 分隔线
* [x] 表格
* [ ] 任务列表

---

## 6. 一个需要注意的地方

Markdown 的任务列表通常会被渲染成复选框。

但是在不同的网站或 Markdown 编辑器中：

**复选框是否可以直接点击，以及点击后是否会自动保存状态，可能有所不同。**

在我们的 VitePress 文档中，这里的主要用途是：

**展示任务的完成状态。**

---

## 7. 实践练习

创建一个自己的学习计划。

例如：

```
# 我的学习计划

- [x] 创建 VitePress 项目
- [x] 学习 Markdown 基础语法
- [ ] 学习 Markdown 表格
- [ ] 学习 VitePress
- [ ] 学习 GitHub Actions
```

然后根据自己的实际进度修改 `[x]` 和 `[ ]`。

---

## 8. 这一课最重要的语法

未完成：

```
- [ ] 任务
```

已完成：

```
- [x] 任务
```

你可以把它简单记成：

**`[ ]` = 没完成**

**`[x]` = 已完成**
