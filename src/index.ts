import {
  fetchBiliBiliFeedFromGist,
  fetchBiliBiliFromGist,
  type BiliBiliStats,
  type Env,
} from "./bilibili";
import { bilibiliCard } from "./svg";

const ENDPOINT_PATH = "/api/bilibili";
const FEED_ENDPOINT_PATH = "/api/bilibili.json";
const GIST_ID_PATTERN = /^[a-zA-Z0-9]+$/;
const CORS_HEADERS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, HEAD, OPTIONS",
  "access-control-allow-headers": "content-type",
  "access-control-max-age": "86400",
};

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);
    const isSvgEndpoint = url.pathname === ENDPOINT_PATH;
    const isFeedEndpoint = url.pathname === FEED_ENDPOINT_PATH;

    if (!isSvgEndpoint && !isFeedEndpoint) {
      return new Response("Not Found", { status: 404 });
    }

    if (isFeedEndpoint && request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: CORS_HEADERS,
      });
    }

    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("Method Not Allowed", {
        status: 405,
        headers: {
          ...(isFeedEndpoint ? CORS_HEADERS : {}),
          allow: isFeedEndpoint ? "GET, HEAD, OPTIONS" : "GET, HEAD",
        },
      });
    }

    const gistId = url.searchParams.get("gist")?.trim();
    if (!gistId) {
      return new Response("Bad Request", {
        status: 400,
        headers: isFeedEndpoint ? CORS_HEADERS : undefined,
      });
    }

    if (!GIST_ID_PATTERN.test(gistId)) {
      return new Response("Bad Request", {
        status: 400,
        headers: isFeedEndpoint ? CORS_HEADERS : undefined,
      });
    }

    let data: unknown;
    try {
      data = isFeedEndpoint
        ? await fetchBiliBiliFeedFromGist(gistId, env)
        : await fetchBiliBiliFromGist(gistId, env);
    } catch (error) {
      console.error(error);
      return new Response("Bad Gateway", {
        status: 502,
        headers: {
          ...(isFeedEndpoint ? CORS_HEADERS : {}),
          "cache-control": "no-store",
        },
      });
    }

    if (isFeedEndpoint) {
      const body = request.method === "HEAD" ? null : JSON.stringify(data);

      return new Response(body, {
        headers: {
          ...CORS_HEADERS,
          "cache-control": "public, max-age=3600",
          "content-type": "application/feed+json; charset=utf-8",
        },
      });
    }

    const body =
      request.method === "HEAD" ? null : bilibiliCard(data as BiliBiliStats);

    return new Response(body, {
      headers: {
        "cache-control": "public, max-age=3600",
        "content-type": "image/svg+xml; charset=utf-8",
      },
    });
  },
} satisfies ExportedHandler<Env>;
