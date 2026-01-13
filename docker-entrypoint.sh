#!/bin/sh

# Docker启动脚本

set -e

# 等待数据库就绪
echo "等待数据库连接..."
max_attempts=30
attempt=0

while [ $attempt -lt $max_attempts ]; do
    if mysql -h "${DB_HOST}" -u "${DB_USER}" -p"${DB_PASSWORD}" -e "SELECT 1" > /dev/null 2>&1; then
        echo "数据库连接成功"
        break
    fi
    
    attempt=$((attempt + 1))
    echo "数据库连接失败，重试 ($attempt/$max_attempts)..."
    sleep 2
done

if [ $attempt -eq $max_attempts ]; then
    echo "无法连接到数据库"
    exit 1
fi

# 运行数据库迁移
echo "运行数据库迁移..."
pnpm db:push || true

# 启动应用
echo "启动应用..."
node -r tsx/esm server/_core/index.ts
