// GitHub Copilot 与 Silly Tavern 连接器
// 基于 clewd 项目结构修改

const API_URL = 'https://api.githubcopilot.com/chat';
const MODEL = 'copilot-chat';

const fetch = require('node-fetch');
const express = require('express');
const { createServer } = require('http');
const WebSocket = require('ws');
const cookieParser = require('cookie-parser');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// 配置管理
let config;
try {
    config = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'), 'utf8'));
} catch (e) {
    config = {
        port: 8191,
        githubToken: '',
        temperature: 0.7,
        maxTokens: 4096,
        debug: false
    };
    fs.writeFileSync(path.join(__dirname, 'config.json'), JSON.stringify(config, null, 2));
    console.log('已创建默认配置文件 config.json，请编辑并添加您的 GitHub token');
    process.exit(1);
}

// 设置 Express 服务器
const app = express();
app.use(express.json({ limit: '100mb' }));
app.use(cookieParser());

const server = createServer(app);
const wss = new WebSocket.Server({ server });

// 认证中间件
const authenticateToken = (req, res, next) => {
    if (!config.githubToken) {
        return res.status(401).json({ error: 'GitHub token 未配置' });
    }
    next();
};

// 处理 Silly Tavern 请求并转换为 GitHub Copilot 格式
app.post('/v1/chat/completions', authenticateToken, async (req, res) => {
    try {
        const { messages, temperature, max_tokens, stream } = req.body;
        
        // 如果启用调试则记录日志
        if (config.debug) {
            console.log('请求:', JSON.stringify(req.body, null, 2));
        }
        
        // 格式化消息以适配 Copilot
        const formattedMessages = messages.map(msg => ({
            role: msg.role === 'system' ? 'system' : msg.role === 'assistant' ? 'assistant' : 'user',
            content: msg.content
        }));
        
        const copilotRequest = {
            messages: formattedMessages,
            temperature: temperature || config.temperature,
            max_tokens: max_tokens || config.maxTokens,
            stream: stream || false,
            model: MODEL
        };
        
        // 向 GitHub Copilot API 发送请求
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.githubToken}`,
                'User-Agent': 'Silly-Tavern-Copilot-Connector/1.0'
            },
            body: JSON.stringify(copilotRequest)
        });
        
        if (!response.ok) {
            const error = await response.text();
            console.error('Copilot API 错误:', error);
            return res.status(response.status).json({ error });
        }
        
        if (stream) {
            // 处理流式响应
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');
            
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            
            let id = 0;
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n').filter(line => line.trim());
                
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = JSON.parse(line.slice(6));
                        
                        // 格式化为 Silly Tavern 期望的 OpenAI SSE 格式
                        const formattedChunk = {
                            id: `chatcmpl-${id++}`,
                            object: 'chat.completion.chunk',
                            created: Math.floor(Date.now() / 1000),
                            model: MODEL,
                            choices: [{
                                index: 0,
                                delta: {
                                    content: data.choices?.[0]?.delta?.content || ''
                                },
                                finish_reason: data.choices?.[0]?.finish_reason || null
                            }]
                        };
                        
                        res.write(`data: ${JSON.stringify(formattedChunk)}\n\n`);
                    }
                }
            }
            
            res.write('data: [DONE]\n\n');
            res.end();
        } else {
            // 处理非流式响应
            const data = await response.json();
            
            // 格式化响应以匹配 Silly Tavern 的 OpenAI 格式
            const formattedResponse = {
                id: `chatcmpl-${crypto.randomBytes(6).toString('hex')}`,
                object: 'chat.completion',
                created: Math.floor(Date.now() / 1000),
                model: MODEL,
                choices: [{
                    index: 0,
                    message: {
                        role: 'assistant',
                        content: data.choices?.[0]?.message?.content || ''
                    },
                    finish_reason: data.choices?.[0]?.finish_reason || 'stop'
                }],
                usage: data.usage || {
                    prompt_tokens: 0,
                    completion_tokens: 0,
                    total_tokens: 0
                }
            };
            
            res.json(formattedResponse);
        }
    } catch (error) {
        console.error('处理请求时出错:', error);
        res.status(500).json({ error: error.message });
    }
});

// 健康检查端点
app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

// 模型列表端点
app.get('/v1/models', (req, res) => {
    res.json({
        data: [
            {
                id: MODEL,
                object: 'model',
                created: Math.floor(Date.now() / 1000),
                owned_by: 'github',
            }
        ]
    });
});

// 启动服务器
const PORT = config.port || 8191;
server.listen(PORT, () => {
    console.log(`
    ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
    ┃                                                              ┃
    ┃   GitHub Copilot 与 Silly Tavern 连接器                      ┃
    ┃   运行于端口 ${PORT}                                         ┃
    ┃                                                              ┃
    ┃   在 Silly Tavern 中配置:                                    ┃
    ┃   1. 在模型菜单中选择 OpenAI API                             ┃
    ┃   2. 将 API 端点设置为 http://localhost:${PORT}              ┃
    ┃   3. 使用 "${MODEL}" 作为模型名称                            ┃
    ┃                                                              ┃
    ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
    `);
});

// 处理优雅关闭
process.on('SIGINT', () => {
    console.log('正在关闭服务器...');
    server.close(() => {
        console.log('服务器已关闭');
        process.exit(0);
    });
});