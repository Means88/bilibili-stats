export interface Env {
  COOKIE?: string;
  ALLOWED_UID_LIST?: string;
}

export interface BiliBiliStats {
  username: string;
  followers: number;
  followings: number;
  recentViews: number | null;
  videos: number;
  level: number;
  description: string;
}

interface BilibiliResponse<T> {
  code?: number;
  message?: string;
  data?: T;
}

interface FingerData {
  b_3?: string;
  b_4?: string;
}

interface CardData {
  card?: {
    name?: string;
    sign?: string;
    fans?: number;
    attention?: number;
    friend?: number;
    level_info?: {
      current_level?: number;
    };
  };
  archive_count?: number;
  follower?: number;
  following?: boolean;
}

interface RelationStatData {
  follower?: number;
  following?: number;
}

interface NavNumData {
  video?: number;
}

interface UpStatData {
  archive?: {
    view?: number;
  };
}

const API_ORIGIN = "https://api.bilibili.com";
const BILIBILI_ORIGIN = "https://www.bilibili.com";
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

function parseBilibiliJson(raw: string): unknown {
  const chunks = raw.split('}{"code":');
  const json = chunks.length === 1 ? raw : `{"code":${chunks[1]}`;

  return JSON.parse(json);
}

function buildUrl(path: string, params: Record<string, string | number>): URL {
  const url = new URL(path, API_ORIGIN);

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, String(value));
  }

  return url;
}

async function fetchJson<T>(
  url: URL,
  cookie: string | undefined,
  uid?: string,
): Promise<BilibiliResponse<T>> {
  const headers: Record<string, string> = {
    accept: "application/json, text/plain, */*",
    "accept-language": "zh-CN,zh;q=0.9,en;q=0.8",
    origin: BILIBILI_ORIGIN,
    referer: uid
      ? `${BILIBILI_ORIGIN.replace("www.", "space.")}/${uid}/`
      : `${BILIBILI_ORIGIN}/`,
    "user-agent": USER_AGENT,
  };

  if (cookie) {
    headers.cookie = cookie;
  }

  const response = await fetch(url, { headers });

  if (!response.ok) {
    throw new Error(`Bilibili request failed: ${url.pathname} ${response.status}`);
  }

  const json = parseBilibiliJson(await response.text()) as BilibiliResponse<T>;
  if (json.code !== undefined && json.code !== 0) {
    throw new Error(
      `Bilibili API failed: ${url.pathname} code=${json.code} message=${json.message ?? ""}`,
    );
  }

  return json;
}

async function safeFetch<T>(
  task: () => Promise<BilibiliResponse<T>>,
): Promise<BilibiliResponse<T>> {
  try {
    return await task();
  } catch (error) {
    console.error(error);
    return {};
  }
}

function readCookieValue(cookies: string, key: string): string | undefined {
  return cookies.match(new RegExp(`(?:^|[,;]\\s*)${key}=([^;,]+)`))?.[1];
}

async function createGuestCookieFromSpi(): Promise<string | undefined> {
  const finger = await safeFetch<FingerData>(() =>
    fetchJson(new URL("/x/frontend/finger/spi", API_ORIGIN), undefined),
  );
  const buvid3 = finger.data?.b_3;
  const buvid4 = finger.data?.b_4;

  if (!buvid3) {
    return undefined;
  }

  const cookies = [
    `buvid3=${buvid3}`,
    `b_nut=${Math.floor(Date.now() / 1000)}`,
  ];

  if (buvid4) {
    cookies.push(`buvid4=${buvid4}`);
  }

  return cookies.join("; ");
}

async function createGuestCookieFromHomePage(): Promise<string | undefined> {
  try {
    const response = await fetch(BILIBILI_ORIGIN, {
      headers: {
        "accept-language": "zh-CN,zh;q=0.9,en;q=0.8",
        "user-agent": USER_AGENT,
      },
    });

    const setCookie = response.headers.get("set-cookie") ?? "";
    const buvid3 = readCookieValue(setCookie, "buvid3");
    const buvid4 = readCookieValue(setCookie, "buvid4");
    const bNut =
      readCookieValue(setCookie, "b_nut") ?? String(Math.floor(Date.now() / 1000));

    if (!response.ok || !buvid3) {
      return undefined;
    }

    return [
      `buvid3=${buvid3}`,
      buvid4 ? `buvid4=${buvid4}` : undefined,
      `b_nut=${bNut}`,
    ]
      .filter(Boolean)
      .join("; ");
  } catch (error) {
    console.error(error);
    return undefined;
  }
}

async function createGuestCookie(): Promise<string | undefined> {
  return (await createGuestCookieFromSpi()) ?? createGuestCookieFromHomePage();
}

async function fetchCard(
  uid: string,
  cookie: string | undefined,
): Promise<BilibiliResponse<CardData>> {
  return safeFetch<CardData>(() =>
    fetchJson(buildUrl("/x/web-interface/card", { mid: uid }), cookie, uid),
  );
}

function readNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function readOptionalNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export async function fetchBiliBili(
  uid: string,
  env: Env,
): Promise<BiliBiliStats> {
  const primaryCookie = env.COOKIE ?? (await createGuestCookie());
  let publicCookie = primaryCookie;
  let card = await fetchCard(uid, publicCookie);

  if (!card.data?.card && env.COOKIE) {
    publicCookie = await createGuestCookie();
    card = await fetchCard(uid, publicCookie);
  }

  const [stat, navNum, upstat] = await Promise.all([
    safeFetch<RelationStatData>(() =>
      fetchJson(buildUrl("/x/relation/stat", { vmid: uid }), publicCookie, uid),
    ),
    safeFetch<NavNumData>(() =>
      fetchJson(buildUrl("/x/space/navnum", { mid: uid }), publicCookie, uid),
    ),
    safeFetch<UpStatData>(() =>
      fetchJson(buildUrl("/x/space/upstat", { mid: uid }), primaryCookie, uid),
    ),
  ]);

  return {
    username: card.data?.card?.name ?? "",
    followers: readNumber(stat.data?.follower ?? card.data?.card?.fans),
    followings: readNumber(
      stat.data?.following ??
        card.data?.card?.attention ??
        card.data?.card?.friend,
    ),
    recentViews: readOptionalNumber(upstat.data?.archive?.view),
    videos: readNumber(navNum.data?.video ?? card.data?.archive_count),
    description: card.data?.card?.sign ?? "",
    level: readNumber(card.data?.card?.level_info?.current_level),
  };
}
