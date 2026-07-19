ARG NODE_VERSION=22.22.0

FROM node:${NODE_VERSION}-bookworm-slim AS builder

WORKDIR /project-billing-account-update-processor

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:${NODE_VERSION}-bookworm-slim AS runtime

ENV NODE_ENV=production

WORKDIR /project-billing-account-update-processor

COPY package.json package-lock.json ./
RUN npm ci --omit=dev \
  && npm cache clean --force

COPY --from=builder --chown=node:node \
  /project-billing-account-update-processor/dist \
  ./dist

USER node

CMD ["node", "dist/src/main.js"]
