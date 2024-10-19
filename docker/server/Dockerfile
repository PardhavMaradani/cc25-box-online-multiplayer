FROM node:23-alpine3.19 AS base
WORKDIR /build
COPY server/package*.json .
RUN npm ci && npm cache clean --force
COPY server/ .
EXPOSE 5000
