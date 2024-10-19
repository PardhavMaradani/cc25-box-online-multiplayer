FROM node:23-alpine3.19 AS base
WORKDIR /build
COPY client/package*.json .
RUN npm ci && npm cache clean --force
COPY client/ .
COPY docker/client/caia-linux/caia-player* .
COPY docker/client/caia-linux/ld-linux.so.2 /lib
COPY docker/client/caia-linux/libc.so.6 /lib
COPY docker/client/start-caia-players.sh .
