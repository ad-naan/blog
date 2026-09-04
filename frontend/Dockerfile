# 构建阶段
FROM node:22-alpine AS builder

WORKDIR /app

# 设置国内镜像源
RUN npm config set registry https://registry.npmmirror.com

# 复制依赖文件
COPY package*.json ./

# 使用 npm ci 基于 lockfile 安装（不再删除 lockfile 重装，保证构建可复现）
RUN npm ci --no-audit --no-fund || npm install --no-audit --no-fund

# 复制源代码
COPY . .

# 声明构建时需要的环境变量
ARG VITE_API_BASE_URL
ARG VITE_SOCKET_URL
ARG VITE_SOCKET_WS_URL
ARG VITE_SOCKET_IO_AUTH_KEY
ARG VITE_APP_TITLE
ARG VITE_APP_DESCRIPTION
ARG VITE_APP_VERSION
ARG VITE_APP_AUTHOR

# 设置环境变量供构建时使用
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_SOCKET_URL=$VITE_SOCKET_URL
ENV VITE_SOCKET_WS_URL=$VITE_SOCKET_WS_URL
ENV VITE_SOCKET_IO_AUTH_KEY=$VITE_SOCKET_IO_AUTH_KEY
ENV VITE_APP_TITLE=$VITE_APP_TITLE
ENV VITE_APP_DESCRIPTION=$VITE_APP_DESCRIPTION
ENV VITE_APP_VERSION=$VITE_APP_VERSION
ENV VITE_APP_AUTHOR=$VITE_APP_AUTHOR

# 构建应用
RUN npm run build

# 生产阶段
FROM nginx:alpine

# 复制构建产物到nginx目录
COPY --from=builder /app/dist /usr/share/nginx/html

# 暴露端口
EXPOSE 80

# 启动nginx
CMD ["nginx", "-g", "daemon off;"] 