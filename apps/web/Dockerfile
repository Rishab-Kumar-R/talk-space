FROM oven/bun:1 AS build
WORKDIR /app

# Copy monorepo root manifests and lock file first for layer caching
COPY package.json bun.lock ./
COPY apps/web/package.json ./apps/web/
RUN bun install --frozen-lockfile

# Copy web source
COPY apps/web ./apps/web

WORKDIR /app/apps/web
RUN bun run build

FROM oven/bun:1-slim
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/apps/web/.next/standalone ./
COPY --from=build /app/apps/web/.next/static ./.next/static
EXPOSE 3000
CMD ["node", "server.js"]
