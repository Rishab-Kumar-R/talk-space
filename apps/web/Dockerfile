FROM oven/bun:1-alpine AS build
WORKDIR /app

COPY package.json bun.lock ./
COPY apps/web ./apps/web
COPY packages ./packages

RUN bun install --frozen-lockfile

WORKDIR /app/apps/web
RUN node_modules/.bin/next build

FROM gcr.io/distroless/nodejs22-debian12:nonroot
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/apps/web/.next/standalone ./
COPY --from=build /app/apps/web/.next/static ./apps/web/.next/static
EXPOSE 3000
CMD ["apps/web/server.js"]
