import { handleTimeout } from "./routes/timeout";
import { handleAuth } from "./routes/auth";
import { handleServer } from "./routes/server";
import { handleRateLimit } from "./routes/rateLimit";
import { log } from "./logger";

const PORT = 3000;

const server = Bun.serve({
  port: PORT,

  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url);

    // Health check
    if (url.pathname === "/health") {
      return Response.json({ status: "ok", uptime_ms: process.uptime() * 1000 });
    }

    // Route table
    if (url.pathname === "/fail/timeout") return await handleTimeout(req);
    if (url.pathname === "/fail/auth") return handleAuth(req);
    if (url.pathname === "/fail/server") return handleServer(req);
    if (url.pathname === "/fail/rate-limit") return handleRateLimit(req);

    // 404 — unknown route
    log({
      level: "warn",
      route: url.pathname,
      method: req.method,
      status: 404,
      error_type: "NOT_FOUND",
      duration_ms: 0,
      message: `No route matched: ${req.method} ${url.pathname}`,
    });

    return Response.json(
      {
        error: {
          type: "NOT_FOUND",
          status: 404,
          message: `No route matched: ${req.method} ${url.pathname}`,
          available_routes: [
            "GET /fail/timeout",
            "GET /fail/auth",
            "GET /fail/server",
            "GET /fail/rate-limit",
            "GET /health",
          ],
        },
      },
      { status: 404 }
    );
  },
});

console.log(`FailTrace running on http://localhost:${server.port}`);