#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"
PORT="${1:-8080}"
URL="http://127.0.0.1:${PORT}/index-a.html"
echo ""
echo "软件快响模版本地预览"
echo "目录: $PWD"
echo ""
echo "请用浏览器打开:"
echo "  http://127.0.0.1:${PORT}/index-a.html"
echo "  http://127.0.0.1:${PORT}/index-b.html"
echo "  http://127.0.0.1:${PORT}/index-c.html"
echo ""
echo "也可直接双击打开 index-a.html / index-b.html / index-c.html"
echo "按 Ctrl+C 停止服务"
echo ""

if command -v open >/dev/null 2>&1; then
  open "$URL" >/dev/null 2>&1 || true
elif command -v xdg-open >/dev/null 2>&1; then
  xdg-open "$URL" >/dev/null 2>&1 || true
fi

exec python3 -m http.server "$PORT" --bind 127.0.0.1
