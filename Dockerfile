# The frontend's configuration is compiled into its bundle by Vite, so the
# tenant has to be known when the image is built, not when it runs. Changing
# tenant means rebuilding. Everything the server reads is passed at run time.
ARG NODE_VERSION=24-slim

FROM node:${NODE_VERSION} AS build
WORKDIR /app

# better-sqlite3 is native and is compiled here, so the toolchain stays in this
# stage and never reaches the image that runs.
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json tsconfig.server.json vite.config.ts index.html ./
COPY src ./src
COPY server ./server

ARG VITE_LOGTO_ENDPOINT
ARG VITE_LOGTO_APP_ID
ARG VITE_LOGTO_RESOURCE
RUN npm run build

# Production dependencies only, rebuilt against this image's Node so the native
# module matches at run time.
RUN npm ci --omit=dev

FROM node:${NODE_VERSION} AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist-server ./dist-server
COPY --from=build /app/dist ./dist
COPY package.json ./

# The database lives on a mounted volume, not in the image, so it survives a
# redeploy. Migrations copy the file here before touching it, so the backups sit
# on the same volume.
ENV DB_PATH=/data/music-recall.sqlite
ENV WEB_ROOT=/app/dist
ENV PORT=8787
EXPOSE 8787

# Root is not needed to serve requests, and the volume is chowned by the compose
# file's init or by hand on first run.
USER node

CMD ["node", "dist-server/index.js"]
