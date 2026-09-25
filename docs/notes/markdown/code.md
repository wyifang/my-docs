# 代码

技术文档中经常需要展示代码、命令和配置文件。

Markdown 提供了两种常用方式：

* 行内代码
* 多行代码块

## 1. 行内代码

### Markdown 源码

```
使用 `git status` 查看仓库状态。
```

### 实际效果

使用 `git status` 查看仓库状态。

### 解释

反引号：

```
`
```

可以把文字变成行内代码。

---

## 2. 多行代码块

### Markdown 源码

````
```
git status
git add .
git commit -m "first commit"
```
````

### 实际效果

```bash
git status
git add .
git commit -m "first commit"
```

### 解释

连续三个反引号：

````
```
````

表示代码块的开始。

再次写三个反引号：

````
```
````

表示代码块的结束。

因此基本结构是：

````
```
代码内容
```
````

---

## 3. 指定代码语言

在开始的三个反引号后面，可以指定代码语言。

例如：

### JavaScript

#### Markdown 源码

````
```js
console.log("Hello")
```
````

#### 实际效果

```js
console.log("Hello")
```

### TypeScript

#### Markdown 源码

````
```ts
const name = "Yifang"
```
````

#### 实际效果

```ts
const name = "Yifang"
```

### HTML

#### Markdown 源码

````
```html
<h1>Hello</h1>
```
````

#### 实际效果

```html
<h1>Hello</h1>
```

### JSON

#### Markdown 源码

````
```json
{
  "name": "Yifang Docs"
}
```
````

#### 实际效果

```json
{
  "name": "Yifang Docs"
}
```

---

## 4. 实践练习

请自己写三个代码块：

### Git

````
```bash
git status
```
````

### JavaScript

````
```js
console.log("Hello")
```
````

### JSON

````
```json
{
  "name": "Yifang Docs"
}
```
````

观察「Markdown 源码」和「实际效果」之间的区别。

---

## 5. 这一课要记住什么？

最基本的代码块：

````
```
代码
```
````

如果希望指定代码语言：

````
```js
代码
```
````

这里的 `js` 就表示 JavaScript。

同样可以使用：

* `bash`
* `ts`
* `html`
* `json`
* `css`
* `python`

等语言标识。

代码块是技术文档中非常重要的 Markdown 功能，因为它可以让命令、程序代码和配置文件以清晰的格式显示出来。
