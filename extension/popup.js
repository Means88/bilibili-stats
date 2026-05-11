const DEFAULT_STATS_FILE_NAME = "bilibili-stats.json";
const LATEST_VIDEOS_FILE_NAME = "latest_videos";
const LATEST_VIDEOS_MARKDOWN_FILE_NAME = "latest_videos.md";

const fields = {
  githubToken: document.querySelector("#githubToken"),
  gistId: document.querySelector("#gistId"),
  videosGistId: document.querySelector("#videosGistId"),
  uid: document.querySelector("#uid"),
  fileName: document.querySelector("#fileName"),
  videosCount: document.querySelector("#videosCount"),
  publicGist: document.querySelector("#publicGist"),
  hint: document.querySelector("#hint"),
  status: document.querySelector("#status"),
  saveSettings: document.querySelector("#saveSettings"),
  syncGist: document.querySelector("#syncGist"),
  syncVideosGist: document.querySelector("#syncVideosGist"),
  exportConfig: document.querySelector("#exportConfig"),
  importConfig: document.querySelector("#importConfig"),
  configFile: document.querySelector("#configFile"),
};

function setStatus(message) {
  fields.status.textContent =
    typeof message === "string" ? message : JSON.stringify(message, null, 2);
}

function parseUidFromUrl(url) {
  return url?.match(/space\.bilibili\.com\/(\d+)/)?.[1] ?? "";
}

function readVideosCount() {
  const count = Number(fields.videosCount.value);
  if (!Number.isFinite(count)) {
    return 5;
  }

  return Math.min(20, Math.max(1, Math.floor(count)));
}

function setBusy(isBusy) {
  fields.saveSettings.disabled = isBusy;
  fields.syncGist.disabled = isBusy;
  fields.syncVideosGist.disabled = isBusy;
  fields.exportConfig.disabled = isBusy;
  fields.importConfig.disabled = isBusy;
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function loadSettings() {
  const [settings, tab] = await Promise.all([
    chrome.storage.local.get([
      "githubToken",
      "gistId",
      "videosGistId",
      "uid",
      "fileName",
      "videosCount",
      "publicGist",
    ]),
    getActiveTab(),
  ]);

  fields.githubToken.value = settings.githubToken ?? "";
  fields.gistId.value = settings.gistId ?? "";
  fields.videosGistId.value = settings.videosGistId ?? "";
  fields.uid.value = settings.uid || parseUidFromUrl(tab?.url) || "";
  fields.fileName.value = settings.fileName ?? DEFAULT_STATS_FILE_NAME;
  fields.videosCount.value = settings.videosCount ?? "5";
  fields.publicGist.checked = settings.publicGist ?? true;

  fields.hint.textContent = tab?.url?.includes("bilibili.com")
    ? "Run this from a Bilibili page."
    : "Open a Bilibili space page before syncing.";
}

async function saveSettings() {
  await chrome.storage.local.set(readConfigFromFields());
}

function readConfigFromFields() {
  return {
    githubToken: fields.githubToken.value.trim(),
    gistId: fields.gistId.value.trim(),
    videosGistId: fields.videosGistId.value.trim(),
    uid: fields.uid.value.trim(),
    fileName: fields.fileName.value.trim() || DEFAULT_STATS_FILE_NAME,
    videosCount: String(readVideosCount()),
    publicGist: fields.publicGist.checked,
  };
}

function writeConfigToFields(config) {
  fields.githubToken.value = typeof config.githubToken === "string" ? config.githubToken : "";
  fields.gistId.value = typeof config.gistId === "string" ? config.gistId : "";
  fields.videosGistId.value =
    typeof config.videosGistId === "string" ? config.videosGistId : "";
  fields.uid.value = typeof config.uid === "string" ? config.uid : "";
  fields.fileName.value =
    typeof config.fileName === "string" && config.fileName
      ? config.fileName
      : DEFAULT_STATS_FILE_NAME;
  fields.videosCount.value =
    typeof config.videosCount === "string" || typeof config.videosCount === "number"
      ? String(config.videosCount)
      : "5";
  fields.publicGist.checked =
    typeof config.publicGist === "boolean" ? config.publicGist : true;
}

function normalizeImportedConfig(config) {
  return {
    githubToken: typeof config.githubToken === "string" ? config.githubToken : "",
    gistId: typeof config.gistId === "string" ? config.gistId : "",
    videosGistId: typeof config.videosGistId === "string" ? config.videosGistId : "",
    uid: typeof config.uid === "string" ? config.uid : "",
    fileName:
      typeof config.fileName === "string" && config.fileName
        ? config.fileName
        : DEFAULT_STATS_FILE_NAME,
    videosCount: String(
      Math.min(20, Math.max(1, Math.floor(Number(config.videosCount) || 5))),
    ),
    publicGist:
      typeof config.publicGist === "boolean" ? config.publicGist : true,
  };
}

function exportConfig() {
  const config = {
    version: 1,
    exportedAt: new Date().toISOString(),
    ...readConfigFromFields(),
  };
  const blob = new Blob([JSON.stringify(config, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `bilibili-stats-extension-config-${new Date()
    .toISOString()
    .slice(0, 10)}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  setStatus("Config exported.");
}

async function importConfig(file) {
  if (!file) {
    return;
  }

  const raw = await file.text();
  const parsed = JSON.parse(raw);
  const config = normalizeImportedConfig(parsed);

  writeConfigToFields(config);
  await chrome.storage.local.set(config);
  setStatus("Config imported.");
}

async function runInBilibiliPage(tabId, action, args) {
  const [injection] = await chrome.scripting.executeScript({
    target: { tabId },
    world: "MAIN",
    func: collectBilibiliDataInPage,
    args: [action, args],
  });

  if (!injection?.result?.ok) {
    throw new Error(injection?.result?.error ?? "Unable to collect Bilibili data");
  }

  return injection.result.data;
}

async function saveGistFiles({
  githubToken,
  gistId,
  description,
  publicGist,
  files,
}) {
  const headers = {
    accept: "application/vnd.github+json",
    authorization: `Bearer ${githubToken}`,
    "content-type": "application/json",
    "x-github-api-version": "2022-11-28",
  };
  const response = await fetch(
    gistId
      ? `https://api.github.com/gists/${encodeURIComponent(gistId)}`
      : "https://api.github.com/gists",
    {
      method: gistId ? "PATCH" : "POST",
      headers,
      body: JSON.stringify(
        gistId
          ? { files }
          : {
              description,
              public: publicGist,
              files,
            },
      ),
    },
  );

  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(json.message ?? `GitHub request failed: ${response.status}`);
  }

  return json;
}

function validateSyncInputs() {
  const githubToken = fields.githubToken.value.trim();
  const uid = fields.uid.value.trim();
  const tabPromise = getActiveTab();

  if (!githubToken) {
    throw new Error("GitHub token is required.");
  }

  if (!/^\d+$/.test(uid)) {
    throw new Error("UID must be a numeric string.");
  }

  return { githubToken, uid, tabPromise };
}

async function getBilibiliTab(tabPromise) {
  const tab = await tabPromise;

  if (!tab?.id || !tab.url?.includes("bilibili.com")) {
    throw new Error("Open a Bilibili page before syncing.");
  }

  return tab;
}

async function syncStatsGist() {
  const { githubToken, uid, tabPromise } = validateSyncInputs();
  const fileName = fields.fileName.value.trim() || DEFAULT_STATS_FILE_NAME;
  const tab = await getBilibiliTab(tabPromise);

  setStatus("Collecting stats from the current Bilibili page...");
  const snapshot = await runInBilibiliPage(tab.id, "stats", { uid });

  setStatus("Saving sanitized stats to GitHub Gist...");
  const gist = await saveGistFiles({
    githubToken,
    gistId: fields.gistId.value.trim(),
    description: "Sanitized Bilibili stats for bilibili-stats worker",
    publicGist: fields.publicGist.checked,
    files: {
      [fileName]: {
        content: JSON.stringify(snapshot, null, 2),
      },
    },
  });

  fields.gistId.value = gist.id;
  await saveSettings();

  setStatus({
    saved: true,
    type: "stats",
    gistId: gist.id,
    gistUrl: gist.html_url,
    workerQuery: `/api/bilibili?gist=${gist.id}`,
    updatedAt: snapshot.updatedAt,
    stats: snapshot.stats,
  });
}

async function syncVideosGist() {
  const { githubToken, uid, tabPromise } = validateSyncInputs();
  const tab = await getBilibiliTab(tabPromise);
  const count = readVideosCount();

  setStatus("Collecting latest videos from the current Bilibili page...");
  const result = await runInBilibiliPage(tab.id, "videos", { uid, count });

  setStatus("Saving latest videos to GitHub Gist...");
  const gist = await saveGistFiles({
    githubToken,
    gistId: fields.videosGistId.value.trim(),
    description: "Latest Bilibili videos",
    publicGist: fields.publicGist.checked,
    files: {
      [LATEST_VIDEOS_FILE_NAME]: {
        content: result.text,
      },
      [LATEST_VIDEOS_MARKDOWN_FILE_NAME]: {
        content: result.markdown,
      },
    },
  });

  fields.videosGistId.value = gist.id;
  await saveSettings();

  setStatus({
    saved: true,
    type: "latest_videos",
    gistId: gist.id,
    gistUrl: gist.html_url,
    files: [LATEST_VIDEOS_FILE_NAME, LATEST_VIDEOS_MARKDOWN_FILE_NAME],
    videos: result.videos,
  });
}

function collectBilibiliDataInPage(action, args) {
  const apiOrigin = "https://api.bilibili.com";
  const mixinKeyEncTab = [
    46, 47, 18, 2, 53, 8, 23, 32, 15, 50, 10, 31, 58, 3, 45, 35, 27, 43, 5,
    49, 33, 9, 42, 19, 29, 28, 14, 39, 12, 38, 41, 13, 37, 48, 7, 16, 24, 55,
    40, 61, 26, 17, 0, 1, 60, 51, 30, 4, 22, 25, 54, 21, 56, 59, 6, 63, 57,
    62, 11, 36, 20, 34, 44, 52,
  ];

  async function requestJson(path, params, options = {}) {
    const url = new URL(path, apiOrigin);
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, String(value));
    }

    const response = await fetch(url.toString(), {
      credentials: "include",
      headers: {
        accept: "application/json, text/plain, */*",
      },
    });
    const text = await response.text();
    let json;

    try {
      json = JSON.parse(text);
    } catch {
      throw new Error(`${path} returned non-JSON response`);
    }

    if (
      !response.ok ||
      (!options.allowNonZeroCode && json.code !== undefined && json.code !== 0)
    ) {
      throw new Error(
        `${path} failed: ${response.status} ${json.code ?? ""} ${json.message ?? ""}`.trim(),
      );
    }

    return json;
  }

  async function requestData(path, params) {
    return (await requestJson(path, params)).data ?? {};
  }

  async function safeRequest(path, params) {
    try {
      return { data: await requestData(path, params) };
    } catch (error) {
      return { error: error instanceof Error ? error.message : String(error) };
    }
  }

  async function getMixinKey() {
    const nav = await requestJson(
      "/x/web-interface/nav",
      {},
      { allowNonZeroCode: true },
    );
    const imgUrl = nav.data?.wbi_img?.img_url;
    const subUrl = nav.data?.wbi_img?.sub_url;
    const imgKey = imgUrl?.split("/").pop()?.split(".")[0];
    const subKey = subUrl?.split("/").pop()?.split(".")[0];

    if (!imgKey || !subKey) {
      throw new Error("Unable to read WBI keys from Bilibili.");
    }

    const key = `${imgKey}${subKey}`;
    return mixinKeyEncTab.slice(0, 32).map((index) => key[index]).join("");
  }

  function signedParams(params, mixinKey) {
    const searchParams = new URLSearchParams();

    for (const [key, value] of Object.entries(params)) {
      searchParams.set(key, String(value).replace(/[!'()*]/g, ""));
    }

    searchParams.set("wts", String(Math.floor(Date.now() / 1000)));
    searchParams.sort();
    searchParams.set("w_rid", md5(`${searchParams.toString()}${mixinKey}`));

    return Object.fromEntries(searchParams.entries());
  }

  async function requestWbiData(path, params) {
    return requestData(path, signedParams(params, await getMixinKey()));
  }

  function readNumber(value) {
    return typeof value === "number" && Number.isFinite(value) ? value : 0;
  }

  function readOptionalNumber(value) {
    return typeof value === "number" && Number.isFinite(value) ? value : null;
  }

  function readPageUsername() {
    return document.title.match(/^(.+?)(?:的个人空间|个人动态|-)/)?.[1] ?? "";
  }

  async function collectStats(uid) {
    const [cardResult, statResult, navNumResult, upstatResult] = await Promise.all([
      safeRequest("/x/web-interface/card", { mid: uid }),
      safeRequest("/x/relation/stat", { vmid: uid }),
      safeRequest("/x/space/navnum", { mid: uid }),
      safeRequest("/x/space/upstat", { mid: uid }),
    ]);
    const cardData = cardResult.data ?? {};
    const card = cardData.card ?? {};
    const stat = statResult.data ?? {};
    const navNum = navNumResult.data ?? {};
    const upstat = upstatResult.data ?? {};
    const stats = {
      username: card.name || readPageUsername(),
      followers: readNumber(stat.follower ?? card.fans),
      followings: readNumber(stat.following ?? card.attention ?? card.friend),
      recentViews: readOptionalNumber(upstat.archive?.view),
      videos: readNumber(navNum.video ?? cardData.archive_count),
      level: readNumber(card.level_info?.current_level),
      description: typeof card.sign === "string" ? card.sign : "",
    };

    if (!stats.username && !stats.followers && !stats.followings && !stats.videos) {
      throw new Error(
        [cardResult.error, statResult.error, navNumResult.error, upstatResult.error]
          .filter(Boolean)
          .join("; ") || "No Bilibili stats were collected",
      );
    }

    return {
      schemaVersion: 1,
      uid,
      updatedAt: new Date().toISOString(),
      stats,
    };
  }

  async function collectVideos(uid, count) {
    const data = await requestWbiData("/x/space/wbi/arc/search", {
      mid: uid,
      ps: count,
      tid: 0,
      pn: 1,
      order: "pubdate",
      platform: "web",
      web_location: 1550101,
    });
    const rawVideos = data.list?.vlist ?? data.list?.archives ?? [];
    const videos = rawVideos.slice(0, count).map(normalizeVideo);

    if (!videos.length) {
      throw new Error("No latest videos were collected.");
    }

    return {
      videos,
      text: `${videos.map(formatPlainVideo).join("\n")}\n`,
      markdown: `${videos.map(formatMarkdownVideo).join("\n\n")}\n`,
    };
  }

  function normalizeVideo(video) {
    const bvid = String(video.bvid ?? "");
    const aid = readNumber(video.aid);
    const title = String(video.title ?? "");
    const views = readNumber(video.play ?? video.stat?.view);
    const replies = readNumber(
      video.comment ?? video.review ?? video.stat?.reply,
    );
    const publishedAt = readNumber(video.created ?? video.pubdate ?? video.ctime);

    return {
      title,
      bvid,
      aid,
      url: bvid
        ? `https://www.bilibili.com/video/${bvid}`
        : `https://www.bilibili.com/video/av${aid}`,
      views,
      replies,
      publishedAt,
      duration: readNumber(video.length ?? video.duration),
      cover: String(video.pic ?? ""),
    };
  }

  function truncateTitle(title) {
    const chars = Array.from(title.replace(/\s+/g, " ").trim());

    if (chars.length <= 26) {
      return chars.join("");
    }

    return `${chars.slice(0, 25).join("")}...`;
  }

  function formatCompactNumber(value) {
    return `${(value / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  }

  function escapeMarkdown(value) {
    return value.replace(/[\\[\]()]/g, "\\$&");
  }

  function formatPlainVideo(video) {
    return `${truncateTitle(video.title)} ▶️:${formatCompactNumber(video.views)} :${video.replies}`;
  }

  function formatMarkdownVideo(video) {
    const title = escapeMarkdown(video.title.replace(/\s+/g, " ").trim());
    return `[${title}](${video.url}) ▶️:${formatCompactNumber(video.views)} :${video.replies}`;
  }

  function md5(value) {
    const input = new TextEncoder().encode(value);
    const bitLength = input.length * 8;
    const paddedLength =
      input.length + 1 + ((56 - ((input.length + 1) % 64) + 64) % 64) + 8;
    const bytes = new Uint8Array(paddedLength);
    const view = new DataView(bytes.buffer);
    const shifts = [
      7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 5, 9, 14,
      20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 4, 11, 16, 23, 4, 11,
      16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 6, 10, 15, 21, 6, 10, 15, 21,
      6, 10, 15, 21, 6, 10, 15, 21,
    ];
    const constants = Array.from({ length: 64 }, (_, index) =>
      Math.floor(Math.abs(Math.sin(index + 1)) * 2 ** 32),
    );
    let a0 = 0x67452301;
    let b0 = 0xefcdab89;
    let c0 = 0x98badcfe;
    let d0 = 0x10325476;

    bytes.set(input);
    bytes[input.length] = 0x80;
    view.setUint32(paddedLength - 8, bitLength >>> 0, true);
    view.setUint32(paddedLength - 4, Math.floor(bitLength / 2 ** 32), true);

    for (let offset = 0; offset < paddedLength; offset += 64) {
      const words = Array.from({ length: 16 }, (_, index) =>
        view.getUint32(offset + index * 4, true),
      );
      let a = a0;
      let b = b0;
      let c = c0;
      let d = d0;

      for (let index = 0; index < 64; index += 1) {
        let f;
        let g;

        if (index < 16) {
          f = (b & c) | (~b & d);
          g = index;
        } else if (index < 32) {
          f = (d & b) | (~d & c);
          g = (5 * index + 1) % 16;
        } else if (index < 48) {
          f = b ^ c ^ d;
          g = (3 * index + 5) % 16;
        } else {
          f = c ^ (b | ~d);
          g = (7 * index) % 16;
        }

        const nextD = d;
        d = c;
        c = b;
        b =
          (b +
            leftRotate(
              (a + f + constants[index] + words[g]) >>> 0,
              shifts[index],
            )) >>>
          0;
        a = nextD;
      }

      a0 = (a0 + a) >>> 0;
      b0 = (b0 + b) >>> 0;
      c0 = (c0 + c) >>> 0;
      d0 = (d0 + d) >>> 0;
    }

    return [a0, b0, c0, d0].map(wordToHex).join("");
  }

  function leftRotate(value, shift) {
    return (value << shift) | (value >>> (32 - shift));
  }

  function wordToHex(value) {
    return [0, 8, 16, 24]
      .map((shift) => ((value >>> shift) & 0xff).toString(16).padStart(2, "0"))
      .join("");
  }

  return (action === "videos"
    ? collectVideos(args.uid, Math.min(20, Math.max(1, Number(args.count) || 5)))
    : collectStats(args.uid)
  )
    .then((data) => ({ ok: true, data }))
    .catch((error) => ({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    }));
}

fields.saveSettings.addEventListener("click", async () => {
  try {
    await saveSettings();
    setStatus("Settings saved.");
  } catch (error) {
    setStatus(error instanceof Error ? error.message : String(error));
  }
});

fields.syncGist.addEventListener("click", async () => {
  setBusy(true);

  try {
    await saveSettings();
    await syncStatsGist();
  } catch (error) {
    setStatus(error instanceof Error ? error.message : String(error));
  } finally {
    setBusy(false);
  }
});

fields.syncVideosGist.addEventListener("click", async () => {
  setBusy(true);

  try {
    await saveSettings();
    await syncVideosGist();
  } catch (error) {
    setStatus(error instanceof Error ? error.message : String(error));
  } finally {
    setBusy(false);
  }
});

fields.exportConfig.addEventListener("click", () => {
  try {
    exportConfig();
  } catch (error) {
    setStatus(error instanceof Error ? error.message : String(error));
  }
});

fields.importConfig.addEventListener("click", () => {
  fields.configFile.value = "";
  fields.configFile.click();
});

fields.configFile.addEventListener("change", async () => {
  try {
    await importConfig(fields.configFile.files?.[0]);
  } catch (error) {
    setStatus(error instanceof Error ? error.message : String(error));
  }
});

loadSettings().catch((error) => {
  setStatus(error instanceof Error ? error.message : String(error));
});
