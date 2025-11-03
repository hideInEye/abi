FROM nginx:1.24.0

# 工作目录
WORKDIR /usr/share/nginx/html

# 删除默认的 nginx 静态文件配置
RUN rm -rf ./*

COPY ./apps/abi/dist ./abi
COPY ./apps/chat/dist ./chat

# 拷贝 Nginx 配置
COPY ./nginx/nginx.conf /etc/nginx/nginx.conf
COPY ./nginx/abi.conf /etc/nginx/conf.d/abi.conf
COPY ./nginx/chat.conf /etc/nginx/conf.d/chat.conf

EXPOSE 80

# 启动 nginx
CMD ["nginx", "-g", "daemon off;"]
