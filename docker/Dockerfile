# Use the Node.js 22 LTS runtime on the same Debian/glibc image family.
FROM node:22-bookworm

WORKDIR /project-billing-account-update-processor

# Install the locked production dependency graph before copying application code.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev \
  && npm cache clean --force

COPY --chown=node:node . .

USER node

CMD ["node", "src/app.js"]
