# ---- Stage 1: build the static production bundle ----
FROM node:20-alpine AS build
WORKDIR /app

# Install deps against the lockfile first for better layer caching
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

# Build the Vite production bundle into /app/dist
COPY . .
RUN npm run build

# ---- Stage 2: serve the static build with nginx ----
FROM nginx:alpine AS serve
# SPA-friendly config (single static page; falls back to index.html)
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
# nginx:alpine already runs nginx in the foreground via its default CMD
