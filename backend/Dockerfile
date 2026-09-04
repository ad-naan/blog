FROM node:22-alpine

# 设置工作目录
WORKDIR /app

# 设置国内镜像源
RUN npm config set registry https://registry.npmmirror.com

# 安装依赖
COPY package*.json ./
RUN npm ci --only=production

# 复制源代码
COPY . .

# 创建日志/上传目录并赋权（卷挂载点），以非 root 用户运行
RUN mkdir -p logs uploads && chown -R node:node /app
USER node

# 设置环境变量
ENV NODE_ENV=production
ENV PORT=8200

# Socket.IO 优化配置
ENV SOCKET_IO_PING_TIMEOUT=60000
ENV SOCKET_IO_PING_INTERVAL=25000
ENV SOCKET_IO_MAX_HTTP_BUFFER_SIZE=1e6

# 暴露端口
EXPOSE 8200

# 健康检查 - 包含Socket.IO检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "const http = require('http'); \
    const options = { hostname: 'localhost', port: 8200, path: '/api/system/health', timeout: 3000 }; \
    const req = http.request(options, (res) => { \
    process.exit(res.statusCode === 200 ? 0 : 1); \
    }); \
    req.on('error', () => process.exit(1)); \
    req.on('timeout', () => process.exit(1)); \
    req.end();"

# 启动应用
CMD ["npm", "start"] 