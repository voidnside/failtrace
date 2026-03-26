import { log } from "../logger";

// Simulated failure modes a real 500 might represent
const FAILURE_SCENARIOS = [
  {
    code: "UNHANDLED_EXCEPTION",
    message: "An unexpected error occurred in the request handler.",
    detail: "TypeError: Cannot read properties of undefined (reading 'id') at processOrder (orders.ts:42)",
  },
  {
    code: "DATABASE_CONNECTION_FAILED",
    message: "The server failed to reach a required data store.",
    detail: "PostgreSQL connection timeout after 5000ms — pool exhausted (max: 10)",
  },
  {
    code: "UPSTREAM_DEPENDENCY_FAILED",
    message: "A downstream service returned an unexpected error.",
    detail: "Payment gateway responded with 503 — circuit breaker open",
  },
] as const;

export function handleServer(req: Request): Response {
  const start = Date.now();

  // Rotate through scenarios deterministically based on the minute
  // so repeated calls show different failure types — useful for demos
  const scenario = FAILURE_SCENARIOS[Math.floor(Date.now() / 60000) % FAILURE_SCENARIOS.length];

  log({
    level: "error",
    route: "/fail/server",
    method: req.method,
    status: 500,
    error_type: scenario.code,
    duration_ms: Date.now() - start,
    message: scenario.detail,
  });

  return Response.json(
    {
      error: {
        type: scenario.code,
        status: 500,
        message: scenario.message,
        hint: "In production: check server logs at the request timestamp. Never expose internal stack traces to clients.",
      },
    },
    { status: 500 }
  );
}