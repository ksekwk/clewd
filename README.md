# GitHub Copilot 与 Silly Tavern 连接器

该项目修改了 clewd 框架，创建了一个连接 GitHub Copilot 与 Silly Tavern 的连接器，让您可以在 Silly Tavern 界面中与 Copilot 聊天。

## 要求

- Node.js 16 或更高版本
- 拥有 Copilot 访问权限的 GitHub 账号
- GitHub 个人访问令牌（Personal Access Token）

## 安装步骤

1. 克隆仓库：
```bash
git clone https://github.com/yourusername/copilot-tavern-connector.git
cd copilot-tavern-connector
```

2. 安装依赖：
```bash
npm install
```

3. 配置 GitHub 令牌：
   - 编辑 `config.json` 文件并添加您的 GitHub 个人访问令牌
   - 确保您的令牌具有访问 Copilot API 的必要权限

## 运行连接器

```bash
npm start
```

服务器默认将在 8191 端口启动（可以在 config.json 中更改）。

## 与 Silly Tavern 连接

1. 打开 Silly Tavern
2. 进入 API 连接设置
3. 选择 "OpenAI API"
4. 将 API 端点设置为 `http://localhost:8191`（或您配置的其他端口）
5. 输入 `copilot-chat` 作为模型名称
6. 不需要 API 密钥，因为认证通过您的 GitHub 令牌处理

## 注意

- 如果遇到问题，尝试在 `config.json` 中启用 `debug` 选项
- 这个连接器会在 Silly Tavern 期望的 OpenAI 格式和 GitHub Copilot 的 API 格式之间进行转换
- 支持实时流式响应

## 免责声明

本项目与 GitHub、Copilot 或 Silly Tavern 没有任何官方关联、认可或连接。