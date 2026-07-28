#!/usr/bin/env bash
set -euo pipefail

APP_NAME=${1:?"Usage: ./build.sh <application-name>"}
IMAGE_TAG=${IMAGE_TAG:-latest}

docker build \
  --pull \
  --file docker/Dockerfile \
  --tag "${APP_NAME}:${IMAGE_TAG}" \
  .
