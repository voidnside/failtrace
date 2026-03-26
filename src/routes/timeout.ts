import { log } from "../logger";

const DELAY_MS = 5000;

export async function handleTimeout(req: Request): Promise<Response> {
  const start = Date.now();

  await new Promise((resolve) => setTimeout(resolve, DELAY_MS));

  const duration = Date.now() - start;

  log({
    level: "warn",
    route: "/fail/timeout",
    method: req.method,
    status: 408,
    error_type: "REQUEST_TIMEOUT",
    duration_ms: duration,
    message: `Request stalled for ${DELAY_MS}ms and timed out`,
  });

  return Response.json(
    {
      error: {
        type: "REQUEST_TIMEOUT",
        status: 408,
        message: "The server did not receive a complete request within the allowed time.",
        simulated_delay_ms: DELAY_MS,
        hint: "In production: check server load, downstream dependencies, and client timeout config.",
      },
    },
    { status: 408 }
  );
}