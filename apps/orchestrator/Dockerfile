FROM oven/bun:1 AS base
WORKDIR /app

# Install dependencies
COPY package.json bun.lockb ./
COPY apps/orchestrator/package.json apps/orchestrator/
COPY packages/db/package.json packages/db/
COPY packages/shared/package.json packages/shared/
COPY packages/bio-types/package.json packages/bio-types/
RUN bun install --frozen-lockfile

# Copy source
COPY packages packages
COPY apps/orchestrator apps/orchestrator

WORKDIR /app/apps/orchestrator
EXPOSE 3001
CMD ["bun", "run", "src/index.ts"]
