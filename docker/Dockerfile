# syntax=docker/dockerfile:1
#
# Builds the @flags/api service. This is a Bun workspace monorepo
# (packages/domain + packages/api), so packages/domain has to be built first
# and made resolvable as the `@flags/domain` workspace package before
# packages/api's own build (which imports it) can run.
#
# Build from the repo root:
#   docker build -f docker/Dockerfile -t flags-api .

# ---- deps -------------------------------------------------------------------
# Installs every workspace's dependencies, including devDependencies (tsup for
# domain, @nestjs/cli for api) needed to produce both dist/ folders below.
#
# packages/load-testing/package.json is copied here too even though its dist/
# output is never shipped (see the runtime stage below) — bun.lock records it
# as a workspace member, and `--frozen-lockfile` fails if a workspace in the
# lockfile has no package.json on disk to reconcile against.
FROM oven/bun:1 AS deps
WORKDIR /repo

COPY package.json bun.lock ./
COPY packages/domain/package.json packages/domain/package.json
COPY packages/api/package.json packages/api/package.json
COPY packages/load-testing/package.json packages/load-testing/package.json

# --ignore-scripts: the root "prepare" script sets up husky git hooks, which
# has no meaning in a container (no .git, no interactive dev workflow)
RUN bun install --frozen-lockfile --ignore-scripts

# ---- build ------------------------------------------------------------------
FROM deps AS build
WORKDIR /repo

COPY . .

# domain first — api imports it as a workspace package resolved via its dist/
RUN cd packages/domain && bun run build
RUN cd packages/api && bun run build

# ---- runtime ------------------------------------------------------------------
# A fresh `bun install --production` here (rather than copying node_modules
# from the build stage) keeps the final image free of devDependencies
# (@nestjs/cli, jest, tsup, nx, eslint, ...), while Bun's workspace linking
# still resolves `@flags/domain` correctly against the local packages/domain
# directory copied in below.
FROM oven/bun:1-slim AS runtime
WORKDIR /repo
ENV NODE_ENV=production

COPY package.json bun.lock ./
COPY packages/domain/package.json packages/domain/package.json
COPY packages/api/package.json packages/api/package.json
# same reconciliation requirement as the deps stage above — load-testing's
# dist/ is still never copied in below, so it never ends up in this image
COPY packages/load-testing/package.json packages/load-testing/package.json

RUN bun install --frozen-lockfile --production --ignore-scripts

COPY --from=build /repo/packages/domain/dist packages/domain/dist
COPY --from=build /repo/packages/api/dist packages/api/dist

WORKDIR /repo/packages/api
EXPOSE 3000

CMD ["bun", "dist/main.js"]
