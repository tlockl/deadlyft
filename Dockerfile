# Build DEADLYFT into a self-contained image.
#
# Three stages so the final image carries neither the toolchain nor the build
# cache: deps installs, build compiles, runner holds only what is needed to
# serve. The generated Prisma client is not in git, so it is generated here
# rather than copied.

FROM node:24-alpine AS deps
WORKDIR /app
# Native modules need these; better-sqlite3 is a devDependency now but npm ci
# still builds it, and sharp resolves prebuilt binaries.
RUN apk add --no-cache libc6-compat python3 make g++
COPY package.json package-lock.json ./
# The repo sets npm's allow-scripts gate, which withholds install scripts and
# leaves native modules unbuilt. In a throwaway build container the supply
# chain is pinned by package-lock.json, so the scripts are allowed to run.
RUN npm ci --foreground-scripts


FROM node:24-alpine AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Generates src/generated/prisma, which .gitignore keeps out of the repo. Needs
# only the schema, not a reachable database.
RUN npx prisma generate
# next build type-checks and prerenders. Pages that read cookies are dynamic,
# so nothing here needs the database either.
RUN npm run build


FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Don't serve as root.
RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 --ingroup nodejs nextjs

# The standalone bundle, plus the two directories it deliberately excludes.
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=build --chown=nextjs:nodejs /app/public ./public

# Note what is *not* here: the Prisma CLI. Migrations run as their own one-shot
# service built from the `build` stage above, which already has the CLI, the
# schema and the TypeScript loader that prisma.config.ts needs. Copying a
# hand-picked subset of node_modules into this slim image to run the CLI here
# would work right up until the CLI reached for something the subset missed.
# See the `migrate` service in docker-compose.yml.

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]
