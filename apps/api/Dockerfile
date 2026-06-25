FROM node:24-alpine AS base
WORKDIR /app
RUN apk add --no-cache openssl
RUN npm install -g pnpm@10.15.0

FROM base AS deps
COPY pnpm-lock.yaml package.json pnpm-workspace.yaml .npmrc ./
COPY apps/api/package.json ./apps/api/package.json
COPY packages/shared/package.json ./packages/shared/package.json
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY . .
RUN pnpm --filter @elixio/api exec prisma generate
RUN pnpm --filter @elixio/api run build

FROM node:24-alpine AS runner
WORKDIR /app
RUN apk add --no-cache openssl
RUN npm install -g pnpm@10.15.0
ENV NODE_ENV=production
COPY pnpm-lock.yaml package.json pnpm-workspace.yaml .npmrc ./
COPY apps/api/package.json ./apps/api/package.json
COPY packages/shared/package.json ./packages/shared/package.json
RUN pnpm install --frozen-lockfile --prod
COPY --from=build /app/apps/api/dist ./dist
COPY --from=build /app/apps/api/prisma ./prisma
COPY --from=build /app/packages/shared ./packages/shared
EXPOSE 3000
CMD ["node", "dist/apps/api/src/server.js"]
