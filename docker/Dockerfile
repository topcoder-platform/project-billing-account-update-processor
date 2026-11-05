ARG NODE_VERSION=24.22.2

FROM node:${NODE_VERSION}-alpine3.24@sha256:8a32c8cf649a49915a66e81e7a609223c708d0adabf288ee3f4077d765542f85 AS builder

RUN apk upgrade --no-cache
WORKDIR /project-billing-account-update-processor

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run check

FROM node:${NODE_VERSION}-alpine3.24@sha256:8a32c8cf649a49915a66e81e7a609223c708d0adabf288ee3f4077d765542f85 AS runtime

ENV NODE_ENV=production

RUN apk upgrade --no-cache
WORKDIR /project-billing-account-update-processor

COPY package.json package-lock.json ./
RUN npm ci --omit=dev \
  && npm cache clean --force \
  && rm -rf /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/corepack /opt/yarn* \
    /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack /usr/local/bin/yarn /usr/local/bin/yarnpkg

COPY --from=builder --chown=node:node \
  /project-billing-account-update-processor/dist \
  ./dist

USER node

CMD ["node", "dist/src/main.js"]
