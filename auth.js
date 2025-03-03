// GitHub Copilot API 令牌测试工具
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

// 加载配置
let config;
try {
    config = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'), 'utf8'));
} catch (e) {
    console.error('加载 config.json 时出错:', e);
    process.exit(1);
}

if (!config.githubToken) {
    console.error('在 config.json 中未找到 GitHub token');
    process.exit(1);
}

async function testToken() {
    try {
        const response = await fetch('https://api.githubcopilot.com/chat/info', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${config.githubToken}`,
                'User-Agent': 'Copilot-Tavern-Connector/1.0'
            }
        });

        if (response.ok) {
            const data = await response.json();
            console.log('✅ 令牌有效。API 连接成功！');
            console.log('API 信息:', data);
        } else {
            console.error('❌ 令牌验证失败:', await response.text());
        }
    } catch (error) {
        console.error('❌ 连接错误:', error.message);
    }
}

testToken();