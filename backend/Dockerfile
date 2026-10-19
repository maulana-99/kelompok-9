FROM golang:1.27 AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -ldflags="-s -w" -o /out/api ./cmd/api

# PO token provider (bgutil): bantu yt-dlp lolos cek bot YouTube dari IP cloud.
# Versi server dan plugin harus sama.
FROM node:22-bookworm AS pot
ARG BGUTIL_VERSION=2.0.2
RUN git clone --depth 1 --branch ${BGUTIL_VERSION} https://github.com/Brainicism/bgutil-ytdlp-pot-provider.git /pot \
 && curl -fsSL https://github.com/Brainicism/bgutil-ytdlp-pot-provider/releases/download/${BGUTIL_VERSION}/bgutil-ytdlp-pot-provider.zip -o /pot/plugin.zip
WORKDIR /pot/server
RUN npm ci && npx tsc && npm prune --omit=dev

FROM node:22-bookworm-slim
ARG WIREPROXY_VERSION=1.1.3
# yt-dlp (standalone, butuh python3) + node untuk JS challenge YouTube,
# wireproxy untuk proxy WARP opsional (lihat docker-entrypoint.sh).
RUN apt-get update \
 && apt-get install -y --no-install-recommends python3 ca-certificates curl \
 && curl -fsSL https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp \
 && chmod +x /usr/local/bin/yt-dlp \
 && curl -fsSL https://github.com/windtf/wireproxy/releases/download/v${WIREPROXY_VERSION}/wireproxy_linux_amd64.tar.gz | tar -xz -C /usr/local/bin wireproxy \
 && apt-get purge -y curl && apt-get autoremove -y && rm -rf /var/lib/apt/lists/*
COPY --from=pot /pot/server /opt/bgutil
COPY --from=pot /pot/plugin.zip /etc/yt-dlp/plugins/bgutil-ytdlp-pot-provider.zip
COPY --from=build /out/api /usr/local/bin/api
COPY docker-entrypoint.sh /usr/local/bin/
ENV APP_ENV=development GIN_MODE=debug
USER node
CMD ["sh", "/usr/local/bin/docker-entrypoint.sh"]
