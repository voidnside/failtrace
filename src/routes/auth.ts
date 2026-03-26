import { log } from "../logger";

export function handleAuth(req: Request): Response {
  const start = Date.now();
  const authHeader = req.headers.get("Authorization");

  // Simulate three distinct 401 sub-cases
  let errorCode: string;
  let detail: string;

  if (!authHeader) {
    errorCode = "MISSING_CREDENTIALS";
    detail = "No Authorization header was provided.";
  } else if (!authHeader.startsWith("Bearer ")) {
    errorCode = "MALFORMED_CREDENTIALS";
    detail = "Authorization header must use the Bearer scheme: 'Authorization: Bearer <token>'.";
  } else {
    // Header is present and well-formed — simulate an expired token
    errorCode = "TOKEN_EXPIRED";
    detail = "The provided token has expired. Generate a new one and retry.";
  }

  log({
    level: "warn",
    route: "/fail/auth",
    method: req.method,
    status: 401,
    error_type: errorCode,
    duration_ms: Date.now() - start,
    message: detail,
  });

  return Response.json(
    {
      error: {
        type: errorCode,
        status: 401,
        message: detail,
        hint: "In production: verify the Authorization header format, token expiry, and issuing environment.",
      },
    },
    {
      status: 401,
      headers: {
        "WWW-Authenticate": 'Bearer realm="failtrace", error="invalid_token"',
      },
    }
  );
}