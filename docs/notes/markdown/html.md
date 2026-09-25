# HTML 与 Markdown

Markdown 可以完成大多数常见的文档格式。

但是，有些 Markdown 本身不容易实现的效果，可以直接使用 HTML。

## 1. Markdown 中可以直接使用 HTML

### Markdown 源码

```
<p>这是一段 HTML 段落。</p>
```

### 实际效果

<p>这是一段 HTML 段落。</p>

Markdown 文档中可以直接写 HTML 标签。

---

## 2. 使用 HTML 换行

Markdown 中普通换行有时不会产生真正的换行效果。

可以使用 HTML 的 `<br>` 标签。

### Markdown 源码

```
第一行<br>
第二行
```

### 实际效果

第一行<br>
第二行

`<br>` 表示换行。

---

## 3. 使用 HTML 设置文字颜色

Markdown 本身没有统一的文字颜色语法。

可以使用 HTML：

### Markdown 源码

```
<span style="color: red;">这是红色文字</span>
```

### 实际效果

<span style="color: red;">这是红色文字</span>

这里：

`<span>` 是 HTML 标签。

`style="color: red;"` 设置文字颜色。

---

## 4. Markdown 和 HTML 可以混合使用

例如：

### Markdown 源码

```
## Git 学习

Git 是一个**版本控制系统**。

<span style="color: red;">这是需要特别注意的内容。</span>
```

### 实际效果

## Git 学习

Git 是一个**版本控制系统**。

<span style="color: red;">这是需要特别注意的内容。</span>

可以看到：

* `##` 是 Markdown
* `**版本控制系统**` 是 Markdown
* `<span>` 是 HTML

所以：

**Markdown 和 HTML 可以在同一个文档中混合使用。**

---

## 5. 为什么需要 HTML？

Markdown 的优点是：

**简单。**

例如：

```
**粗体**
```

就可以产生粗体。

但是 Markdown 并没有为所有网页效果提供语法。

例如：

* 文字颜色
* 某些特殊布局
* 自定义样式
* 特定 HTML 属性

这时候就可以使用 HTML。

---

## 6. 一个重要原则

虽然 Markdown 可以混合 HTML，但不要一开始就大量使用 HTML。

一般情况下：

**Markdown 能解决的问题，优先使用 Markdown。**

只有当 Markdown 不方便实现时，再考虑 HTML。

例如：

普通粗体：

```
**重要内容**
```

不需要写成：

```
<strong>重要内容</strong>
```

前者更简单，也更符合 Markdown 文档的写法。

---

## 7. 实践练习

自己尝试写下面的内容：

### Markdown 源码

```
# 我的学习笔记

这是普通文字。

**这是粗体文字。**

<span style="color: red;">这是红色文字。</span>

第一行<br>
第二行
```

观察 Markdown 和 HTML 在同一个页面中的效果。

---

## 8. 这一课最重要的知识

Markdown 和 HTML 可以混合使用。

简单记住：

**Markdown 优先，HTML 补充。**

Markdown 负责：

* 标题
* 段落
* 列表
* 链接
* 图片
* 表格
* 代码
* 引用

HTML 可以补充一些 Markdown 不方便实现的效果。
