# 链接

Markdown 可以使用简单的语法创建链接。

## 1. 最基本的链接

### Markdown 源码

```markdown
[Google](https://www.google.com)
```

### 实际效果

[Google](https://www.google.com)

### 解释

链接的基本格式是：

```text
[链接文字](链接地址)
```

其中：

* `[Google]` 是用户看到的文字
* `(https://www.google.com)` 是点击后要访问的地址

---

## 2. 链接到自己的网站页面

Markdown 不仅可以链接到外部网站，也可以链接到我们自己的文档页面。

### Markdown 源码

```markdown
[标题与段落](./headings-and-paragraphs)

[文字强调](./text-emphasis)

[列表](./lists)
```

### 实际效果

[标题与段落](./headings-and-paragraphs)

[文字强调](./text-emphasis)

[列表](./lists)

### 解释

这里使用的是**相对路径**。

例如：

```text
./headings-and-paragraphs
```

表示当前页面所在目录下面的：

```text
headings-and-paragraphs
```

页面。

因为当前页面是：

```text
/notes/markdown/links
```

所以：

```text
./headings-and-paragraphs
```

会指向：

```text
/notes/markdown/headings-and-paragraphs
```

注意：

**VitePress 页面链接通常不需要写 .md。**

所以我们写：

```markdown
[标题与段落](./headings-and-paragraphs)
```

而不是：

```markdown
[标题与段落](./headings-and-paragraphs.md)
```

---

## 3. 链接到外部网站

### Markdown 源码

```markdown
[GitHub](https://github.com)

[VitePress](https://vitepress.dev/)
```

### 实际效果

[GitHub](https://github.com)

[VitePress](https://vitepress.dev/)

### 解释

这里的地址是完整的网址。

基本结构仍然是：

```text
[链接文字](网址)
```

只是括号里面换成了外部网站的 URL。

---

## 4. 在新窗口打开链接

普通 Markdown 链接并不能直接指定「在新窗口打开」。

如果需要控制链接行为，可以使用 HTML。

### HTML 源码

```html
<a href="https://github.com" target="_blank">在新窗口打开 GitHub</a>
```

### 实际效果

<a href="https://github.com" target="_blank">在新窗口打开 GitHub</a>

### 解释

这里已经不是 Markdown 语法，而是 HTML。

其中：

```text
href
```

表示链接地址。

```text
target="_blank"
```

表示在新窗口或新标签页打开。

---

## 5. 实践练习

现在自己尝试创建三个链接。

### 要求

1. 链接到已经学习过的「标题与段落」
2. 链接到 GitHub
3. 链接到 VitePress 官网

例如：

```markdown
[标题与段落](./headings-and-paragraphs)

[GitHub](https://github.com)

[VitePress](https://vitepress.dev/)
```

然后观察：

**Markdown 源码**

↓

**浏览器实际显示的链接**

这就是 Markdown 学习中非常重要的一个过程：

**写语法 → 看渲染结果 → 理解语法和结果之间的关系。**
