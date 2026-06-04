# Сборка
FROM node:20-alpine AS builder

WORKDIR /app
ENV NODE_OPTIONS="--max-old-space-size=1024"
COPY package*.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build

# Nginx
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]