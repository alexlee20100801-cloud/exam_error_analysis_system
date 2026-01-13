#!/bin/bash

# 深圳初高中错题分析学习系统 - 阿里云部署脚本
# 使用方法: bash deploy-to-aliyun.sh

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查环境变量
check_env() {
    log_info "检查环境变量..."
    
    required_vars=(
        "ALIYUN_ECS_IP"
        "ALIYUN_ECS_USER"
        "ALIYUN_ECS_KEY"
        "ALIYUN_RDS_HOST"
        "ALIYUN_RDS_USER"
        "ALIYUN_RDS_PASSWORD"
        "ALIYUN_RDS_DATABASE"
        "ALIYUN_OSS_REGION"
        "ALIYUN_OSS_BUCKET"
        "ALIYUN_OSS_ACCESS_KEY"
        "ALIYUN_OSS_SECRET"
        "DOMAIN_NAME"
    )
    
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            log_error "缺少环境变量: $var"
            return 1
        fi
    done
    
    log_info "环境变量检查完成"
}

# 构建应用
build_app() {
    log_info "构建应用..."
    
    # 安装依赖
    if [ ! -d "node_modules" ]; then
        pnpm install
    fi
    
    # 构建前端
    pnpm build
    
    # 创建生产环境配置
    cat > .env.production << EOF
DATABASE_URL=mysql://${ALIYUN_RDS_USER}:${ALIYUN_RDS_PASSWORD}@${ALIYUN_RDS_HOST}:3306/${ALIYUN_RDS_DATABASE}

VITE_APP_ID=your_app_id
OAUTH_SERVER_URL=your_oauth_server_url
VITE_OAUTH_PORTAL_URL=your_oauth_portal_url

BUILT_IN_FORGE_API_URL=your_llm_api_url
BUILT_IN_FORGE_API_KEY=your_llm_api_key

OSS_REGION=${ALIYUN_OSS_REGION}
OSS_BUCKET=${ALIYUN_OSS_BUCKET}
OSS_ACCESS_KEY_ID=${ALIYUN_OSS_ACCESS_KEY}
OSS_ACCESS_KEY_SECRET=${ALIYUN_OSS_SECRET}

NODE_ENV=production
PORT=3000
JWT_SECRET=$(openssl rand -base64 32)

OWNER_NAME=Your Name
OWNER_OPEN_ID=your_open_id
EOF
    
    log_info "应用构建完成"
}

# 上传文件到ECS
upload_to_ecs() {
    log_info "上传文件到ECS..."
    
    # 创建远程目录
    ssh -i "${ALIYUN_ECS_KEY}" "${ALIYUN_ECS_USER}@${ALIYUN_ECS_IP}" \
        "mkdir -p /app/exam-system && cd /app/exam-system"
    
    # 上传项目文件
    scp -i "${ALIYUN_ECS_KEY}" -r \
        --exclude=node_modules \
        --exclude=.git \
        --exclude=dist \
        . "${ALIYUN_ECS_USER}@${ALIYUN_ECS_IP}:/app/exam-system/"
    
    log_info "文件上传完成"
}

# 在ECS上安装依赖
install_on_ecs() {
    log_info "在ECS上安装依赖..."
    
    ssh -i "${ALIYUN_ECS_KEY}" "${ALIYUN_ECS_USER}@${ALIYUN_ECS_IP}" << 'EOF'
        cd /app/exam-system
        
        # 安装Node.js（如果未安装）
        if ! command -v node &> /dev/null; then
            curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
            sudo apt-get install -y nodejs
        fi
        
        # 安装pnpm
        npm install -g pnpm
        
        # 安装项目依赖
        pnpm install --prod
        
        # 运行数据库迁移
        pnpm db:push
EOF
    
    log_info "依赖安装完成"
}

# 配置PM2
configure_pm2() {
    log_info "配置PM2..."
    
    ssh -i "${ALIYUN_ECS_KEY}" "${ALIYUN_ECS_USER}@${ALIYUN_ECS_IP}" << 'EOF'
        # 安装PM2
        npm install -g pm2
        
        cd /app/exam-system
        
        # 启动应用
        pm2 start "pnpm start" --name "exam-system"
        
        # 配置开机自启
        pm2 startup
        pm2 save
EOF
    
    log_info "PM2配置完成"
}

# 配置Nginx
configure_nginx() {
    log_info "配置Nginx..."
    
    ssh -i "${ALIYUN_ECS_KEY}" "${ALIYUN_ECS_USER}@${ALIYUN_ECS_IP}" << EOF
        # 安装Nginx
        sudo apt-get update
        sudo apt-get install -y nginx
        
        # 创建Nginx配置
        sudo tee /etc/nginx/sites-available/exam-system > /dev/null << 'NGINX'
upstream exam_backend {
    server localhost:3000;
}

server {
    listen 80;
    server_name ${DOMAIN_NAME};
    
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name ${DOMAIN_NAME};
    
    ssl_certificate /etc/ssl/certs/exam-system.crt;
    ssl_certificate_key /etc/ssl/private/exam-system.key;
    
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        proxy_pass http://exam_backend;
        proxy_cache_valid 200 30d;
        add_header Cache-Control "public, max-age=2592000";
    }
    
    location / {
        proxy_pass http://exam_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
NGINX
        
        # 启用配置
        sudo ln -sf /etc/nginx/sites-available/exam-system /etc/nginx/sites-enabled/
        sudo rm -f /etc/nginx/sites-enabled/default
        
        # 测试配置
        sudo nginx -t
        
        # 启动Nginx
        sudo systemctl restart nginx
        sudo systemctl enable nginx
EOF
    
    log_info "Nginx配置完成"
}

# 验证部署
verify_deployment() {
    log_info "验证部署..."
    
    # 检查应用是否运行
    ssh -i "${ALIYUN_ECS_KEY}" "${ALIYUN_ECS_USER}@${ALIYUN_ECS_IP}" \
        "pm2 list | grep exam-system"
    
    # 检查Nginx是否运行
    ssh -i "${ALIYUN_ECS_KEY}" "${ALIYUN_ECS_USER}@${ALIYUN_ECS_IP}" \
        "sudo systemctl status nginx"
    
    log_info "部署验证完成"
}

# 主函数
main() {
    log_info "开始部署到阿里云..."
    
    check_env || exit 1
    build_app || exit 1
    upload_to_ecs || exit 1
    install_on_ecs || exit 1
    configure_pm2 || exit 1
    configure_nginx || exit 1
    verify_deployment || exit 1
    
    log_info "部署完成！"
    log_info "应用地址: https://${DOMAIN_NAME}"
}

# 运行主函数
main
