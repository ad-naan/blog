#!/bin/bash

# MySQL 初始化脚本 - 创建数据库和用户

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}MySQL 数据库初始化${NC}"
echo -e "${GREEN}========================================${NC}"

# MySQL 配置
MYSQL_ROOT_PASSWORD="du_adnaan@"
MYSQL_DATABASE="blog_prod"
MYSQL_USER="blog_user"
MYSQL_PASSWORD="du_adnaan@"

echo -e "${YELLOW}正在初始化 MySQL 数据库...${NC}"

# 执行 SQL 命令
docker exec -i mysql8 mysql -uroot -p"${MYSQL_ROOT_PASSWORD}" <<EOF
-- 创建数据库
CREATE DATABASE IF NOT EXISTS ${MYSQL_DATABASE} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 删除旧用户（如果存在）
DROP USER IF EXISTS '${MYSQL_USER}'@'%';

-- 创建新用户
CREATE USER '${MYSQL_USER}'@'%' IDENTIFIED BY '${MYSQL_PASSWORD}';

-- 授予所有权限
GRANT ALL PRIVILEGES ON ${MYSQL_DATABASE}.* TO '${MYSQL_USER}'@'%';

-- 刷新权限
FLUSH PRIVILEGES;

-- 显示用户权限
SHOW GRANTS FOR '${MYSQL_USER}'@'%';
EOF

if [ $? -eq 0 ]; then
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}MySQL 初始化完成！${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}数据库: ${MYSQL_DATABASE}${NC}"
    echo -e "${GREEN}用户: ${MYSQL_USER}${NC}"
    echo -e "${GREEN}密码: ${MYSQL_PASSWORD}${NC}"
    echo -e "${GREEN}========================================${NC}"
else
    echo -e "${RED}MySQL 初始化失败！${NC}"
    exit 1
fi
