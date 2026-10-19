FROM golang:1.27 AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -ldflags="-s -w" -o /out/api ./cmd/api

FROM node:22-bookworm-slim
# yt-dlp (standalone, butuh python3) + node untuk JS challenge YouTube.
RUN apt-get update \
 && apt-get install -y --no-install-recommends python3 ca-certificates curl \
 && curl -fsSL https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp \
 && chmod +x /usr/local/bin/yt-dlp \
 && apt-get purge -y curl && apt-get autoremove -y && rm -rf /var/lib/apt/lists/*
COPY --from=build /out/api /usr/local/bin/api
ENV APP_ENV=production GIN_MODE=release
USER node
CMD ["api"]
