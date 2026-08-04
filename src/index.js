/* ==========================================================================
   EEBA 2027 — entry point del Worker

   Due responsabilità soltanto:
     /api/*   → il router in src/api.js
     tutto il resto → i file statici in public/ (binding ASSETS)

   Il router è rimasto nella forma che aveva da Pages Function
   (onRequest({request, env, params})), così i test non cambiano.
   ========================================================================== */

import { onRequest } from "./api.js";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === "/api" || url.pathname.startsWith("/api/")) {
      const path = url.pathname
        .replace(/^\/api\/?/, "")
        .split("/")
        .filter(Boolean)
        .map(decodeURIComponent);

      try {
        return await onRequest({ request, env, ctx, params: { path } });
      } catch (e) {
        return new Response(
          JSON.stringify({ error: "Errore del server", detail: String(e?.message || e).slice(0, 300) }),
          { status: 500, headers: { "content-type": "application/json; charset=utf-8" } }
        );
      }
    }

    return env.ASSETS.fetch(request);
  }
};
