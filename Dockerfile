FROM node:26.12.1-trixie-slim@sha256:36793bcbb160a6a16cede1e62b93f84e26b78a972a8a4c0b879c1c12f22761ec AS current-system
# Keep Debian's signed stable/security repositories and the original Node payload.
# Refresh installed OS packages normally; unresolved advisories remain scan failures.
RUN apt-get update \
    && apt-get upgrade --yes \
    && rm -rf /var/lib/apt/lists/* \
    && npm install --global npm@12.2.1 \
    && test "$(npm --version)" = '12.2.1' \
    && npm cache clean --force

FROM current-system AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

FROM current-system AS runtime
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3000 SNEUP_LOG_DIR=/app/logs
WORKDIR /app
COPY --from=dependencies --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node package.json package-lock.json ./
COPY --chown=node:node src ./src
COPY --chown=node:node public ./public
COPY --chown=node:node scripts ./scripts
RUN mkdir -p /app/logs && chown node:node /app/logs
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:3000/ready',r=>{r.resume();process.exitCode=r.statusCode===200?0:1}).on('error',()=>{process.exitCode=1})"
CMD ["node", "scripts/start-cloud.js"]
