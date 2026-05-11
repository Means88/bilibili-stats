import { fetchBiliBiliFromGist, type Env } from "./bilibili";
import { bilibiliCard } from "./svg";

const ENDPOINT_PATH = "/api/bilibili";
const GIST_ID_PATTERN = /^[a-zA-Z0-9]+$/;

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

    const gistId = url.searchParams.get("gist")?.trim();
    if (!gistId) {
      return new Response("Bad Request", { status: 400 });
    }

    if (!GIST_ID_PATTERN.test(gistId)) {
      return new Response("Bad Request", { status: 400 });
    }

    let data;
    try {
      data = await fetchBiliBiliFromGist(gistId, env);
    } catch (error) {
      console.error(error);
      return new Response("Bad Gateway", {
        status: 502,
        headers: {
          "cache-control": "no-store",
        },
      });
    }

    const body = request.method === "HEAD" ? null : bilibiliCard(data);

    return new Response(body, {
      headers: {
        "cache-control": "public, max-age=3600",
        "content-type": "image/svg+xml; charset=utf-8",
      },
    });
  },
} satisfies ExportedHandler<Env>;
