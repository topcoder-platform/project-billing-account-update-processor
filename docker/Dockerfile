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

FROM alpine:3.24@sha256:be2656061b536c1883c4034790e21d0a09c5aaaf51968b89368a3c0371ea2c9a AS runtime
# Use Alpine's dynamically linked Node so apk updates the OpenSSL used at runtime.
RUN apk upgrade --no-cache \
    && apk add --no-cache 'nodejs~24' 'nodejs>=24.22.2-r0' \
        'libssl3>=3.5.10-r0' 'libcrypto3>=3.5.10-r0' 'zlib>=1.4-r0' ca-certificates icu-data-full \
    && node -e "const libs = process.report.getReport().sharedObjects; if (!['/usr/lib/libssl.so.3', '/usr/lib/libcrypto.so.3'].every(p => libs.includes(p))) process.exit(1)" \
    && addgroup -g 1000 node \
    && adduser -D -u 1000 -G node node \
    && ln -s /usr/bin/node /usr/local/bin/node
COPY --from=builder /usr/local/bin/docker-entrypoint.sh /usr/local/bin/
ENTRYPOINT ["docker-entrypoint.sh"]
WORKDIR /project-billing-account-update-processor
ENV NODE_ENV=production
COPY --from=production-dependencies /project-billing-account-update-processor/node_modules ./node_modules
COPY package.json package-lock.json ./
COPY --from=builder --chown=node:node \
  /project-billing-account-update-processor/dist \
  ./dist

USER node

CMD ["node", "dist/src/main.js"]
