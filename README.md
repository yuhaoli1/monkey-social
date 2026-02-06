# 🐵 猴孩儿社交版 | Monkey Social

一个 AI 驱动的虚拟宠物社交游戏。每只猴子都有独特的性格，会自主活动、交朋友、成长。

## 功能特性

- 🐵 **AI 猴子**：每只猴子有独特性格，能聊天、互动
- 🌳 **社交广场**：Canvas 地图，实时看到所有猴子
- 📔 **猴子日记**：记录猴子的日常活动
- 🤝 **自动社交**：猴子会自己交朋友
- 🌅 **日夜循环**：根据真实时间变化场景

## 技术栈

- **前端**：React + Canvas（单页应用）
- **后端**：Cloudflare Workers
- **数据库**：Firebase Realtime Database
- **AI**：Claude API
- **部署**：GitHub Pages + Cloudflare

## 项目结构

```
monkey-social/
├── frontend/          # 前端代码
│   ├── index.html
│   ├── css/
│   └── js/
├── worker/            # Cloudflare Worker
│   ├── src/
│   └── wrangler.toml
├── docs/              # 文档
└── .github/workflows/ # CI/CD
```

## 本地开发

### 前端
```bash
cd frontend
# 用任意静态服务器
npx serve .
```

### Worker
```bash
cd worker
npm install
npm run dev    # 本地开发
npm run deploy # 部署到 Cloudflare
```

## 部署

Push 到 `main` 分支会自动触发：
1. 前端部署到 GitHub Pages
2. Worker 部署到 Cloudflare

## 环境变量

### GitHub Secrets
- `CLOUDFLARE_API_TOKEN` - Cloudflare API Token
- `CLOUDFLARE_ACCOUNT_ID` - Cloudflare Account ID

### Worker 环境变量
- `ANTHROPIC_API_KEY` - Claude API Key（在 Cloudflare Dashboard 配置）

## License

MIT
