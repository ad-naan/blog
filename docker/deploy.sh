#!/bin/bash

# Docker部署脚本
# 使用方法: ./deploy.sh [start|stop|restart|logs|status]

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 项目根目录
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# 检查Docker和Docker Compose是否安装
check_docker() {
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}错误: Docker未安装${NC}"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        echo -e "${RED}错误: Docker Compose未安装${NC}"
        exit 1
    fi
}

# 检查环境变量文件
check_env_files() {
    echo -e "${YELLOW}检查环境变量文件...${NC}"
    
    if [ ! -f "$PROJECT_ROOT/.env" ]; then
        echo -e "${YELLOW}警告: .env 文件不存在，请参考 .env.example 创建${NC}"
        echo -e "${YELLOW}在项目根目录创建 .env 文件并配置环境变量${NC}"
    else
        echo -e "${GREEN}环境变量文件检查通过${NC}"
    fi
}

# 启动服务
start_services() {
    echo -e "${GREEN}启动博客服务...${NC}"
    cd "$PROJECT_ROOT"
    docker-compose up -d
    echo -e "${GREEN}服务启动完成！${NC}"
    echo -e "${GREEN}前端: http://www.adnaan.site${NC}"
    echo -e "${GREEN}后端API: http://api.adnaan.site${NC}"
    echo -e "${GREEN}Socket.IO: http://api.adnaan.site/socket.io (自动升级到WebSocket)${NC}"
    echo -e "${YELLOW}Socket.IO健康检查: http://api.adnaan.site/api/socket/health${NC}"
}

# 停止服务
stop_services() {
    echo -e "${YELLOW}停止博客服务...${NC}"
    cd "$PROJECT_ROOT"
    docker-compose down
    echo -e "${GREEN}服务已停止${NC}"
}

# 重启服务
restart_services() {
    echo -e "${YELLOW}重启博客服务...${NC}"
    cd "$PROJECT_ROOT"
    docker-compose restart
    echo -e "${GREEN}服务重启完成${NC}"
}

# 查看日志
show_logs() {
    echo -e "${GREEN}显示服务日志...${NC}"
    cd "$PROJECT_ROOT"
    docker-compose logs -f
}

# 查看服务状态
show_status() {
    echo -e "${GREEN}服务状态:${NC}"
    cd "$PROJECT_ROOT"
    docker-compose ps
}

# 重新构建并启动
rebuild_services() {
    echo -e "${YELLOW}重新构建并启动服务...${NC}"
    cd "$PROJECT_ROOT"
    docker-compose down
    docker-compose up -d --build
    echo -e "${GREEN}服务重新构建并启动完成${NC}"
}

# 清理服务
cleanup_services() {
    echo -e "${YELLOW}清理服务（包括数据卷）...${NC}"
    read -p "确定要删除所有数据吗？(y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        cd "$PROJECT_ROOT"
        docker-compose down -v --remove-orphans
        docker system prune -f
        echo -e "${GREEN}清理完成${NC}"
    else
        echo -e "${YELLOW}取消清理${NC}"
    fi
}

# 主函数
main() {
    check_docker
    
    case "${1:-start}" in
        start)
            check_env_files
            start_services
            ;;
        stop)
            stop_services
            ;;
        restart)
            restart_services
            ;;
        logs)
            show_logs
            ;;
        status)
            show_status
            ;;
        rebuild)
            check_env_files
            rebuild_services
            ;;
        cleanup)
            cleanup_services
            ;;
        *)
            echo "使用方法: $0 [start|stop|restart|logs|status|rebuild|cleanup]"
            echo ""
            echo "命令说明:"
            echo "  start    - 启动所有服务"
            echo "  stop     - 停止所有服务"
            echo "  restart  - 重启所有服务"
            echo "  logs     - 查看服务日志"
            echo "  status   - 查看服务状态"
            echo "  rebuild  - 重新构建并启动服务"
            echo "  cleanup  - 清理所有服务和数据"
            exit 1
            ;;
    esac
}

# 执行主函数
main "$@" 