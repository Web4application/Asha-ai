import { jwtVerify, createRemoteJWKSet } from "jose";

export default {
  async fetch(request, env, ctx) {
    // Verify the POLICY_AUD environment variable is set
    if (!env.POLICY_AUD) {
      return new Response("Missing required audience", {
        status: 403,
        headers: { "Content-Type": "text/plain" },
      });
    }

    // Get the JWT from the request headers
    const token = request.headers.get("cf-access-jwt-assertion");

    // Check if token exists
    if (!token) {
      return new Response("Missing required CF Access JWT", {
        status: 403,
        headers: { "Content-Type": "text/plain" },
      });
    }

    try {
      // Create JWKS from your team domain
      const JWKS = createRemoteJWKSet(
        new URL(`${env.TEAM_DOMAIN}/cdn-cgi/access/certs`),
      );

      // Verify the JWT
      const { payload } = await jwtVerify(token, JWKS, {
        issuer: env.TEAM_DOMAIN,
        audience: env.POLICY_AUD,
      });

      // Token is valid, proceed with your application logic
      return new Response(`Hello ${payload.email || "authenticated user"}!`, {
        headers: { "Content-Type": "text/plain" },
      });
    } catch (error) {
      // Token verification failed
      const message = error instanceof Error ? error.message : "Unknown error";
      return new Response(`Invalid token: ${message}`, {
        status: 403,
        headers: { "Content-Type": "text/plain" },
      });
    }
  },
};