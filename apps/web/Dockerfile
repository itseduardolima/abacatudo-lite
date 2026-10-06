FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@11.5.1 --activate
WORKDIR /repo

FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json ./
COPY packages/config/package.json packages/config/
COPY packages/shared/package.json packages/shared/
COPY apps/web/package.json apps/web/
RUN pnpm install --frozen-lockfile

FROM deps AS build
# Mesma origem em produção: o Caddy serve /api/* na API (docs/specs/01-arquitetura.md § Um domínio só).
ARG NEXT_PUBLIC_API_URL=/api
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
COPY packages ./packages
COPY apps/web ./apps/web
RUN pnpm --filter @gastos/shared build && pnpm --filter web build

FROM node:22-alpine AS runner
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /repo/apps/web/.next/standalone ./
COPY --from=build /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=build /repo/apps/web/public ./apps/web/public
USER node
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
