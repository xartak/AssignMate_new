# dev stage
FROM node:20-alpine AS dev

WORKDIR /app

COPY package.json package-lock.json* ./

RUN if [ -f package-lock.json ]; then \
      npm ci; \
    else \
      npm install; \
    fi

COPY . .

ENV CHOKIDAR_USEPOLLING=true
ENV WATCHPACK_POLLING=true

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]


# build stage
FROM node:20-alpine AS build

WORKDIR /app

# Аргументы для сборки
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}

# Копируем и устанавливаем зависимости
COPY package.json package-lock.json* ./
RUN if [ -f package-lock.json ]; then \
      npm ci; \
    else \
      npm install; \
    fi

# Копируем исходный код и собираем
COPY . .
RUN npm run build


# stage stage (для стейджинга)
FROM nginx:1.27-alpine AS stage

# Копируем конфиг nginx
COPY nginx.stage.conf /etc/nginx/conf.d/default.conf

# Копируем собранные файлы
COPY --from=build /app/dist /usr/share/nginx/html

# Здоровье контейнера
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q --spider http://localhost/ || exit 1

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]