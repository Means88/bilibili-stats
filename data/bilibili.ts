import biliAPI from "bili-api";
import got from "got";

const parseBSON = (data: any) => {
  const chunks = data.split('}{"code":');
  if (chunks.length === 1) {
    return data;
  }
  return chunks.map((chunk: any, index: number) => {
    if (index === 0) {
      return chunk + "}";
    }
    return '{"code":' + chunk;
  })[1];
};

function catchError<ARGS extends any[], T extends (...args: ARGS) => any>(
  fn: T
) {
  return async (...args: ARGS) => {
    try {
      return await fn(...args);
    } catch (error: any) {
      // stub for error handling
      console.error(error);
      return {
        data: {
          page: {},
        },
      };
    }
  };
}

export async function fetchBiliBili(
  uid: string,
  mine = false
): Promise<BiliBiliStats> {
  const defaultGot = async ({ url, cookie = { buvid: 233 } }: any) => {
    const biliCookie = (() => {
      const defaultCookie: string = Object.entries({
        _uuid: "",
        rpdid: "",
        ...cookie,
      })
        .map(([k, v]) => `${k}=${v}`)
        .join(";");
      if (!mine) {
        return defaultCookie;
      }
      return process.env.COOKIE ?? defaultCookie;
    })();

    const raw = await got(new URL(url), {
      headers: {
        referer: "https://www.bilibili.com/",
        origin: "https://www.bilibili.com",
        cookie: process.env.COOKIE ?? biliCookie,
        "user-agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      },
    }).text();

    return JSON.parse(parseBSON(raw));
  };

  const results = await biliAPI(
    { mid: uid },
    [
      "video",
      "stat",
      "info",
      "upstat"
    ],
    {
      got: catchError(defaultGot),
    }
  );

  return {
    username: results?.info?.data?.name ?? "",
    followers: results?.stat?.data?.follower ?? 0,
    followings: results?.stat?.data?.following ?? 0,
    recentViews: results?.upstat?.data?.archive?.view ?? 0,
    videos: results?.video ?? 0,
    description: results?.info?.data?.sign ?? "",
    level: results?.info?.data?.level ?? 0,
  };
}

export interface BiliBiliStats {
  username: string;
  followers: number;
  followings: number;
  recentViews: number;
  videos: number;
  level: number;
  description: string;
}
