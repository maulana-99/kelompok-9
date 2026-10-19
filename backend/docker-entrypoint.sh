#!/bin/sh
# Server POT untuk yt-dlp (127.0.0.1:4416, alamat default plugin).
node /opt/bgutil/build/main.js &

# Proxy WARP opsional untuk host yang IP-nya diblokir YouTube (Render).
# Isi config wireproxy (wgcf profile + [Socks5] BindAddress = 127.0.0.1:1080)
# sebagai Secret File; YOUTUBE_PROXY otomatis diarahkan ke situ.
WIREPROXY_CONFIG="${WIREPROXY_CONFIG:-/etc/secrets/wireproxy.conf}"
if [ -f "$WIREPROXY_CONFIG" ]; then
	wireproxy -c "$WIREPROXY_CONFIG" &
	export YOUTUBE_PROXY="${YOUTUBE_PROXY:-socks5h://127.0.0.1:1080}"
fi

exec api
