# 博客系统部署指南

## 架构说明

本项目采用分离式部署架构：

### 目录结构

```
/home/base/              # 公共服务目录
├── comm.yml             # 公共服务配置
├── mysql/               # MySQL 数据目录
│   └── data/
├── redis/               # Redis 数据目录
│   └── data/
└── nginx/               # Nginx 配置和静态文件
    ├── conf/
    │   └── default.conf
    ├── html/            # 前端静态文件（由博客应用构建）
    └── logs/

/home/blog/              # 博客应用目录
├── backend/             # 后端代码
├── frontend/            # 前端代码
├── docker/              # Docker 配置
│   └── .env
└── docker-compose.yml   # 博客应用配置
```

### 服务说明

- **comm.yml** - 公共服务（MySQL、Redis、Nginx）
- **docker-compose.yml** - 博客应用（Backend、Frontend Builder）

前端采用静态文件构建方式，构建完成后的文件输出到 `/home/base/nginx/html` 目录，由公共 Nginx 服务。

## 部署步骤

### 0. 创建共享网络

首先创建 Docker 网络供所有服务使用：

```bash
docker network create blog_network
```

### 1. 启动公共服务（在 /home/base 目录）

进入公共服务目录并启动 MySQL、Redis、Nginx：

```bash
cd /home/base
docker-compose -f comm.yml up -d
```

查看服务状态：

```bash
docker-compose -f comm.yml ps
```

### 2. 配置环境变量（在 /home/blog 目录）

确保 `/home/blog/docker/.env` 文件已正确配置：

- `DB_HOST=mysql8` - MySQL 容器名称
- `REDIS_HOST=redis7` - Redis 容器名称
- 其他配置项（密码、密钥等）

### 3. 构建并启动博客应用（在 /home/blog 目录）

进入博客应用目录，启动 backend 和构建 frontend：

```bash
cd /home/blog
docker-compose up -d --build
```

前端构建完成后，静态文件会自动输出到 `/home/base/nginx/html` 目录，公共 Nginx 会直接服务这些文件。

查看服务状态：

```bash
docker-compose ps
```

### 4. 验证部署

检查前端静态文件是否生成：

```bash
ls -la /home/base/nginx/html/
```

检查 Nginx 容器内的文件：

```bash
docker exec nginx125 ls -la /usr/share/nginx/html/
```

### 5. 重新加载 Nginx 配置

如果修改了 Nginx 配置，需要重新加载：

```bash
cd /home/base
docker exec nginx125 nginx -s reload
```

### 4. 查看日志

查看所有服务日志：

```bash
# 公共服务日志
docker-compose -f comm.yml logs -f

# 博客应用日志
docker-compose logs -f

# 查看特定服务日志
docker-compose logs -f backend
docker-compose logs -f frontend
```

### 5. 访问应用

- 前端：http://www.adnaan.site
- 后端 API：http://api.adnaan.site 或 http://www.adnaan.site/api
- Socket.IO：ws://www.adnaan.site/socket.io

## 网络架构

```
┌─────────────────────────────────────────────────────────┐
│                    comm_default 网络                     │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐          │
│  │  MySQL   │    │  Redis   │    │  Nginx   │          │
│  │  (3306)  │    │  (6379)  │    │  (80)    │          │
│  └──────────┘    └──────────┘    └────┬─────┘          │
│       ▲               ▲                 │                │
│       │               │                 │ 反向代理        │
│       │               │                 ▼                │
│  ┌────┴───────────────┴────┐    ┌──────────┐          │
│  │      Backend            │    │ Frontend │          │
│  │      (8200)             │    │  (3000)  │          │
│  └─────────────────────────┘    └──────────┘          │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

## 容器通信说明

1. **Backend → MySQL**：通过容器名 `mysql8` 连接
2. **Backend → Redis**：通过容器名 `redis7` 连接
3. **Nginx → Backend**：通过容器名 `blog-backend` 代理
4. **Nginx → Frontend**：通过容器名 `blog-frontend` 代理
5. **外部访问**：通过 Nginx (80端口) 统一入口

## 常用命令

### 重启服务

```bash
# 重启公共服务
docker-compose -f comm.yml restart

# 重启博客应用
docker-compose restart

# 重启特定服务
docker-compose restart backend
```

### 停止服务

```bash
# 停止博客应用
docker-compose down

# 停止公共服务（注意：会影响其他依赖这些服务的应用）
docker-compose -f comm.yml down
```

### 重新构建

```bash
# 重新构建并启动博客应用
docker-compose up -d --build

# 仅重新构建 backend
docker-compose up -d --build backend
```

### 查看网络

```bash
# 查看所有网络
docker network ls

# 查看 comm_default 网络详情
docker network inspect comm_default
```

## 数据持久化

### MySQL 数据

- 位置：`./mysql/data`
- 容器内路径：`/var/lib/mysql`

### Redis 数据

- 位置：`./redis/data`
- 容器内路径：`/data`

### Backend 日志和上传文件

- 日志：`./backend/logs`
- 上传文件：`./backend/uploads`

### Nginx 日志

- 位置：`./nginx/logs`
- 容器内路径：`/var/log/nginx`

## 故障排查

### Backend 无法连接 MySQL

1. 检查 MySQL 容器是否运行：`docker ps | grep mysql8`
2. 检查网络连接：`docker exec blog-backend ping mysql8`
3. 检查环境变量：`docker exec blog-backend env | grep DB_`

### Backend 无法连接 Redis

1. 检查 Redis 容器是否运行：`docker ps | grep redis7`
2. 检查网络连接：`docker exec blog-backend ping redis7`
3. 测试 Redis 连接：`docker exec redis7 redis-cli -a dy03280411 ping`

### Nginx 无法代理到 Backend

1. 检查 Backend 容器是否运行：`docker ps | grep blog-backend`
2. 检查 Backend 健康状态：`docker inspect blog-backend | grep Health`
3. 测试 Backend API：`curl http://localhost:8200/api/system/health`
4. 检查 Nginx 配置：`docker exec nginx125 nginx -t`
5. 重新加载 Nginx：`docker exec nginx125 nginx -s reload`

### 查看容器日志

```bash
# Backend 日志
docker logs blog-backend --tail 100 -f

# Frontend 日志
docker logs blog-frontend --tail 100 -f

# Nginx 日志
docker logs nginx125 --tail 100 -f
```

## 生产环境注意事项

1. **修改所有默认密码**：
   - MySQL root 密码
   - Redis 密码
   - JWT 密钥
   - Socket.IO 认证密钥

2. **配置 HTTPS**：
   - 在 Nginx 中添加 SSL 证书
   - 修改端口映射为 443

3. **备份数据**：
   - 定期备份 MySQL 数据
   - 定期备份 Redis 数据
   - 备份上传的文件

4. **监控服务**：
   - 使用 `docker stats` 监控资源使用
   - 配置日志轮转避免磁盘占满
   - 设置告警机制

5. **性能优化**：
   - 调整 MySQL 连接池大小
   - 配置 Redis 内存限制
   - 优化 Nginx 缓存策略
