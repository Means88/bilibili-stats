import { fetchBiliBili, type Env } from "./bilibili";
import { bilibiliCard } from "./svg";

const ENDPOINT_PATH = "/api/bilibili";
const NUMERIC_UID_PATTERN = /^\d+$/;

function parseAllowedUidList(value: string | undefined): Set<string> {
  return new Set(
    (value ?? "")
      .split(",")
      .map((uid) => uid.trim())
      .filter(Boolean),
  );
}

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname !== ENDPOINT_PATH) {
      return new Response("Not Found", { status: 404 });
    }

    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("Method Not Allowed", {
        status: 405,
        headers: {
          allow: "GET, HEAD",
        },
      });
    }

    const uid = url.searchParams.get("uid")?.trim();
    if (!uid) {
      return new Response("Bad Request", { status: 400 });
    }

    if (!NUMERIC_UID_PATTERN.test(uid)) {
      return new Response("Bad Request", { status: 400 });
    }

    if (env.ALLOWED_UID_LIST && !parseAllowedUidList(env.ALLOWED_UID_LIST).has(uid)) {
      return new Response("Forbidden", { status: 403 });
    }

    const data = await fetchBiliBili(uid, env);
    const body = request.method === "HEAD" ? null : bilibiliCard(data);

    return new Response(body, {
      headers: {
        "cache-control": "public, max-age=600",
        "content-type": "image/svg+xml; charset=utf-8",
      },
    });
  },
} satisfies ExportedHandler<Env>;
