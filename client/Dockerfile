# --- dev: Vite con hot reload (el código se monta como volumen) ---
FROM node:22-alpine AS dev
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev"]

# --- build: genera /app/dist ---
FROM dev AS build
RUN npm run build

# --- prod: Nginx sirve el build y hace proxy de /api hacia la API ---
FROM nginx:alpine AS prod
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
