FROM oven/bun:1-alpine AS build
WORKDIR /app

# Copy full monorepo structure needed for workspace install
COPY package.json bun.lock ./
COPY apps/web/package.json ./apps/web/
COPY packages/ui/package.json ./packages/ui/
COPY packages/eslint-config/package.json ./packages/eslint-config/
COPY packages/typescript-config/package.json ./packages/typescript-config/

RUN bun install --frozen-lockfile

# Copy web source and build
COPY apps/web ./apps/web
COPY packages ./packages

RUN cd apps/web && ../../node_modules/.bin/next build

FROM gcr.io/distroless/nodejs22-debian12:nonroot
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/apps/web/.next/standalone ./
COPY --from=build /app/apps/web/.next/static ./.next/static
EXPOSE 3000
CMD ["server.js"]
