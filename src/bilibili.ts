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

export async function fetchBiliBiliFromGist(
  gistId: string,
  env: Env,
): Promise<BiliBiliStats> {
  const gistRaw = await fetchText(
    `${GITHUB_API_ORIGIN}/gists/${encodeURIComponent(gistId)}`,
    env,
  );
  const gist = JSON.parse(gistRaw) as GithubGist;
  const file = pickStatsFile(gist);

  if (!file) {
    throw new Error(`Gist does not contain ${GIST_FILE_NAME}`);
  }

  const content =
    file.content ??
    (file.raw_url ? await fetchText(file.raw_url, env) : undefined);

  if (!content) {
    throw new Error(`Gist file ${file.filename ?? GIST_FILE_NAME} is empty`);
  }

  return normalizeStats(JSON.parse(content) as BiliBiliStatsSnapshot);
}
