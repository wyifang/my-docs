# 图片

Markdown 可以使用简单的语法插入图片。

## 1. 最基本的图片

图片的基本格式是：

```markdown
![图片说明](图片地址)
```

其中：

* `![图片说明]` 是图片的替代文字
* `(图片地址)` 是图片的位置

---

## 2. 使用网络图片

### Markdown 源码

```markdown
![VitePress Logo](https://vitepress.dev/vitepress-logo-large.webp)
```

### 实际效果

![VitePress Logo](https://vitepress.dev/vitepress-logo-large.webp)

### 解释

这里使用的是网络图片地址。

浏览器会根据这个地址找到图片，然后显示出来。

---

## 3. 图片和链接的区别

你会发现：

链接：

```markdown
[链接文字](链接地址)
```

图片：

```markdown
![图片说明](图片地址)
```

它们非常相似。

最大的区别是：

```text
[文字]
```

表示显示文字。

而：

```text
![图片说明]
```

表示显示图片。

前面的 `!` 非常重要。

---

## 4. 使用本地图片

如果图片保存在自己的项目中，也可以使用相对路径。

例如项目中有：

```text
docs/
├── notes/
│   └── markdown/
│       ├── images.md
│       └── images/
│           └── example.png
```

那么可以写：

### Markdown 源码

```markdown
![示例图片](./images/example.png)
```

### 解释

`./images/example.png` 表示：

从当前 Markdown 文件所在目录开始，找到：

```text
images/example.png
```

---

## 5. 图片的替代文字

例如：

### Markdown 源码

```markdown
![VitePress 官方 Logo](https://vitepress.dev/vitepress-logo-large.webp)
```

这里：

```text
VitePress 官方 Logo
```

就是图片的替代文字。

如果图片因为某种原因无法显示，浏览器可以显示这段文字。

因此，替代文字最好能够简单描述图片是什么。

---

## 6. 实践练习

请尝试完成两个练习。

### 练习 1

把下面的图片语法复制到页面中：

```markdown
![VitePress Logo](https://vitepress.dev/vitepress-logo-large.webp)
```

观察图片是否能够正常显示。

### 练习 2

自己修改图片的替代文字。

例如：

```markdown
![这是 VitePress 的 Logo](https://vitepress.dev/vitepress-logo-large.webp)
```

观察实际效果。

---

这一课需要记住的核心语法只有一个：

```markdown
![图片说明](图片地址)
```

尤其注意：

**图片比链接多了一个 `!`。**
