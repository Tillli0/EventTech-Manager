// Minimaler Reverse-Proxy: lässt NUR den Kalender-Feed-Pfad zum lokalen Supabase
// durch, alles andere -> 404. So kann ein (temporärer) Cloudflare-Quick-Tunnel
// auf diesen Proxy zeigen, ohne das restliche Backend öffentlich zu machen.
//
// Start:  node tunnel/feed-proxy.mjs
// Dann:   cloudflared tunnel --url http://localhost:8788

import http from "node:http";

const TARGET = "http://127.0.0.1:54321";
const ALLOW = /^\/functions\/v1\/calendar-feed/;
const PORT = 8788;

const server = http.createServer((req, res) => {
  if (!ALLOW.test(req.url || "")) {
    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    res.end("Not found");
    return;
  }
  const target = new URL(req.url, TARGET);
  const proxyReq = http.request(
    target,
    { method: req.method, headers: { ...req.headers, host: target.host } },
    (proxyRes) => {
      res.writeHead(proxyRes.statusCode || 502, proxyRes.headers);
      proxyRes.pipe(res);
    },
  );
  proxyReq.on("error", () => {
    res.writeHead(502, { "content-type": "text/plain" });
    res.end("Bad gateway");
  });
  req.pipe(proxyReq);
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`feed-proxy läuft auf http://127.0.0.1:${PORT} -> nur ${ALLOW} -> ${TARGET}`);
});
