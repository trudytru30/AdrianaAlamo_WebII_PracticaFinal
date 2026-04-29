# ── Stage 1: dependencias ─────────────────────────────────────────────────────
FROM node:22-alpine AS deps

WORKDIR /app

# Copiar solo los manifiestos para aprovechar la caché de Docker
COPY package*.json ./

# Instalar únicamente dependencias de producción
RUN npm ci --omit=dev

# ── Stage 2: imagen final ─────────────────────────────────────────────────────
FROM node:22-alpine AS runner

# Usuario sin privilegios de root
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

# Copiar dependencias instaladas del stage anterior
COPY --from=deps /app/node_modules ./node_modules

# Copiar código fuente
COPY src ./src
COPY package.json ./

# Directorio para uploads temporales
RUN mkdir -p uploads && chown appuser:appgroup uploads

USER appuser

EXPOSE 3000

# Healthcheck para Docker / Compose / Kubernetes
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["node", "src/index.js"]
