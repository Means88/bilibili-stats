export interface Env {
  GITHUB_TOKEN?: string;
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

export interface JsonFeed {
  version?: string;
  title?: string;
  home_page_url?: string;
  description?: string;
  icon?: string;
  language?: string;
  items?: unknown[];
}

interface GithubGistFile {
  filename?: string;
  type?: string;
  raw_url?: string;
  content?: string;
  truncated?: boolean;
}

interface GithubGist {
  files?: Record<string, GithubGistFile>;
}

interface BiliBiliStatsSnapshot {
  schemaVersion?: number;
  uid?: string;
  updatedAt?: string;
  stats?: Partial<BiliBiliStats>;
}

const GITHUB_API_ORIGIN = "https://api.github.com";
const GIST_FILE_NAME = "bilibili-stats.json";
const HOMEPAGE_BILIBILI_FILE_NAME = "bilibili.json";

function readNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function readOptionalNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function readString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function normalizeStats(snapshot: BiliBiliStatsSnapshot): BiliBiliStats {
  const stats = snapshot.stats ?? {};

  return {
    username: readString(stats.username),
    followers: readNumber(stats.followers),
    followings: readNumber(stats.followings),
    recentViews: readOptionalNumber(stats.recentViews),
    videos: readNumber(stats.videos),
    level: readNumber(stats.level),
    description: readString(stats.description),
  };
}

async function fetchText(url: string, env: Env): Promise<string> {
  const headers: Record<string, string> = {
    accept: "application/vnd.github+json",
    "user-agent": "bilibili-stats-worker",
  };

  if (env.GITHUB_TOKEN) {
    headers.authorization = `Bearer ${env.GITHUB_TOKEN}`;
  }

  const response = await fetch(url, { headers });

  if (!response.ok) {
    throw new Error(`GitHub request failed: ${response.status}`);
  }

  return response.text();
}

function pickStatsFile(gist: GithubGist): GithubGistFile | undefined {
  const files = gist.files ?? {};

  return (
    files[GIST_FILE_NAME] ??
    Object.values(files).find((file) => file.filename?.endsWith(".json"))
  );
}

function pickFile(gist: GithubGist, fileName: string): GithubGistFile | undefined {
  return gist.files?.[fileName];
}

async function fetchGist(gistId: string, env: Env): Promise<GithubGist> {
  const gistRaw = await fetchText(
    `${GITHUB_API_ORIGIN}/gists/${encodeURIComponent(gistId)}`,
    env,
  );

  return JSON.parse(gistRaw) as GithubGist;
}

async function readGistFileContent(
  file: GithubGistFile | undefined,
  env: Env,
  fileName: string,
): Promise<string> {
  if (!file) {
    throw new Error(`Gist does not contain ${fileName}`);
  }

  const content =
    file.content ??
    (file.raw_url ? await fetchText(file.raw_url, env) : undefined);

  if (!content) {
    throw new Error(`Gist file ${file.filename ?? fileName} is empty`);
  }

  return content;
}

export async function fetchBiliBiliFromGist(
  gistId: string,
  env: Env,
): Promise<BiliBiliStats> {
  const gist = await fetchGist(gistId, env);
  const content = await readGistFileContent(
    pickStatsFile(gist),
    env,
    GIST_FILE_NAME,
  );

  return normalizeStats(JSON.parse(content) as BiliBiliStatsSnapshot);
}

export async function fetchBiliBiliFeedFromGist(
  gistId: string,
  env: Env,
): Promise<JsonFeed> {
  const gist = await fetchGist(gistId, env);
  const content = await readGistFileContent(
    pickFile(gist, HOMEPAGE_BILIBILI_FILE_NAME),
    env,
    HOMEPAGE_BILIBILI_FILE_NAME,
  );

  return JSON.parse(content) as JsonFeed;
}
