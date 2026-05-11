const DEFAULT_FILE_NAME = "bilibili-stats.json";

const fields = {
  githubToken: document.querySelector("#githubToken"),
  gistId: document.querySelector("#gistId"),
  uid: document.querySelector("#uid"),
  fileName: document.querySelector("#fileName"),
  publicGist: document.querySelector("#publicGist"),
  hint: document.querySelector("#hint"),
  status: document.querySelector("#status"),
  saveSettings: document.querySelector("#saveSettings"),
  syncGist: document.querySelector("#syncGist"),
};

function setStatus(message) {
  fields.status.textContent =
    typeof message === "string" ? message : JSON.stringify(message, null, 2);
}

function parseUidFromUrl(url) {
  return url?.match(/space\.bilibili\.com\/(\d+)/)?.[1] ?? "";
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
      "uid",
      "fileName",
      "publicGist",
    ]),
    getActiveTab(),
  ]);

  fields.githubToken.value = settings.githubToken ?? "";
  fields.gistId.value = settings.gistId ?? "";
  fields.uid.value = settings.uid || parseUidFromUrl(tab?.url) || "";
  fields.fileName.value = settings.fileName ?? DEFAULT_FILE_NAME;
  fields.publicGist.checked = settings.publicGist ?? true;

  fields.hint.textContent = tab?.url?.includes("bilibili.com")
    ? "Run this from a Bilibili page."
    : "Open a Bilibili space page before syncing.";
}

async function saveSettings() {
  await chrome.storage.local.set({
    githubToken: fields.githubToken.value.trim(),
    gistId: fields.gistId.value.trim(),
    uid: fields.uid.value.trim(),
    fileName: fields.fileName.value.trim() || DEFAULT_FILE_NAME,
    publicGist: fields.publicGist.checked,
  });
}

async function collectStats(tabId, uid) {
  const [injection] = await chrome.scripting.executeScript({
    target: { tabId },
    world: "MAIN",
    func: collectBilibiliStatsInPage,
    args: [uid],
  });

  if (!injection?.result?.ok) {
    throw new Error(injection?.result?.error ?? "Unable to collect Bilibili stats");
  }

  return injection.result.snapshot;
}

async function saveGist({ githubToken, gistId, fileName, publicGist, snapshot }) {
  const files = {
    [fileName]: {
      content: JSON.stringify(snapshot, null, 2),
    },
  };
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
              description: "Sanitized Bilibili stats for bilibili-stats worker",
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

async function syncGist() {
  const githubToken = fields.githubToken.value.trim();
  const uid = fields.uid.value.trim();
  const fileName = fields.fileName.value.trim() || DEFAULT_FILE_NAME;
  const tab = await getActiveTab();

  if (!githubToken) {
    throw new Error("GitHub token is required.");
  }

  if (!/^\d+$/.test(uid)) {
    throw new Error("UID must be a numeric string.");
  }

  if (!tab?.id || !tab.url?.includes("bilibili.com")) {
    throw new Error("Open a Bilibili page before syncing.");
  }

  setStatus("Collecting stats from the current Bilibili page...");
  const snapshot = await collectStats(tab.id, uid);

  setStatus("Saving sanitized stats to GitHub Gist...");
  const gist = await saveGist({
    githubToken,
    gistId: fields.gistId.value.trim(),
    fileName,
    publicGist: fields.publicGist.checked,
    snapshot,
  });

  fields.gistId.value = gist.id;
  await saveSettings();

  setStatus({
    saved: true,
    gistId: gist.id,
    gistUrl: gist.html_url,
    workerQuery: `/api/bilibili?gist=${gist.id}`,
    updatedAt: snapshot.updatedAt,
    stats: snapshot.stats,
  });
}

function collectBilibiliStatsInPage(uid) {
  const apiOrigin = "https://api.bilibili.com";

  async function request(path, params) {
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

    if (!response.ok || (json.code !== undefined && json.code !== 0)) {
      throw new Error(`${path} failed: ${response.status} ${json.code ?? ""} ${json.message ?? ""}`.trim());
    }

    return json.data ?? {};
  }

  async function safeRequest(path, params) {
    try {
      return { data: await request(path, params) };
    } catch (error) {
      return { error: error instanceof Error ? error.message : String(error) };
    }
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

  return Promise.all([
    safeRequest("/x/web-interface/card", { mid: uid }),
    safeRequest("/x/relation/stat", { vmid: uid }),
    safeRequest("/x/space/navnum", { mid: uid }),
    safeRequest("/x/space/upstat", { mid: uid }),
  ])
    .then(([cardResult, statResult, navNumResult, upstatResult]) => {
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
          [
            cardResult.error,
            statResult.error,
            navNumResult.error,
            upstatResult.error,
          ]
            .filter(Boolean)
            .join("; ") || "No Bilibili stats were collected",
        );
      }

      return {
        ok: true,
        snapshot: {
          schemaVersion: 1,
          uid,
          updatedAt: new Date().toISOString(),
          stats,
        },
      };
    })
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
  fields.syncGist.disabled = true;
  fields.saveSettings.disabled = true;

  try {
    await saveSettings();
    await syncGist();
  } catch (error) {
    setStatus(error instanceof Error ? error.message : String(error));
  } finally {
    fields.syncGist.disabled = false;
    fields.saveSettings.disabled = false;
  }
});

loadSettings().catch((error) => {
  setStatus(error instanceof Error ? error.message : String(error));
});
