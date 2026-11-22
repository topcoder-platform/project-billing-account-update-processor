ARG NODE_VERSION=24.22.2

FROM node:${NODE_VERSION}-alpine3.24@sha256:8a32c8cf649a49915a66e81e7a609223c708d0adabf288ee3f4077d765542f85 AS builder

RUN apk upgrade --no-cache && apk add --no-cache "zlib>=1.4-r0"
WORKDIR /project-billing-account-update-processor

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run check

FROM node:${NODE_VERSION}-alpine3.24@sha256:8a32c8cf649a49915a66e81e7a609223c708d0adabf288ee3f4077d765542f85 AS production-dependencies
WORKDIR /project-billing-account-update-processor
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

FROM alpine:3.24 AS runtime
ENV NODE_ENV=production
RUN apk upgrade --no-cache \
    && apk add --no-cache ca-certificates 'nodejs~24' 'nodejs>=24.22.3-r0' 'libcrypto3>=3.5.9-r1' 'libssl3>=3.5.9-r1' 'zlib>=1.4-r0' \
    && addgroup -S -g 1000 node \
    && adduser -S -D -u 1000 -G node node
WORKDIR /project-billing-account-update-processor
COPY --from=production-dependencies /project-billing-account-update-processor/node_modules ./node_modules
COPY package.json package-lock.json ./
COPY --from=builder --chown=node:node \
  /project-billing-account-update-processor/dist \
  ./dist

USER node

CMD ["node", "dist/src/main.js"]
