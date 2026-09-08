# 爱的地图

一个移动端优先的情侣纪念日网站，包含纪念日、时间轴、悄悄话、时光胶囊、云端共同空间，以及情侣吵架后的和好智能体。

## 本地预览

```bash
npm install
npm run dev
```

本地前端预览地址是 `http://localhost:3000`。

如果需要本地联调 Netlify Functions：

```bash
npm run netlify:dev
```

打开 `http://localhost:8888`。

## Netlify 自动部署

Netlify 连接 GitHub 仓库后，每次 push 会自动部署。

构建配置已写在 `netlify.toml`：

- Build command: `npx next build`
- Publish directory: `out`
- Functions directory: `netlify/functions`

## 环境变量

在 Netlify 后台配置：

```text
DEEPSEEK_API_KEY=你的 DeepSeek token
```

可选：

```text
DEEPSEEK_MODEL=deepseek-v4-flash
```

`DEEPSEEK_API_KEY` 只在 Netlify Function 中读取，不会暴露到前端页面。
