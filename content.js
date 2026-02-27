const MIN_RATE = 0.25;
const STEP = 0.25;
const DEFAULT_RATE = 1;
const DEFAULT_MAX_RATE = 2;
const ALLOWED_MAX_RATES = [2, 3, 4];

let state = {
  currentRate: DEFAULT_RATE,
  maxRate: DEFAULT_MAX_RATE
};

function normalizeMaxRate(value) {
  const parsed = Number(value);
  return ALLOWED_MAX_RATES.includes(parsed) ? parsed : DEFAULT_MAX_RATE;
}

function clampRate(rate, maxRate) {
  const rounded = Math.round(rate / STEP) * STEP;
  const clamped = Math.min(Math.max(rounded, MIN_RATE), maxRate);
  return Number(clamped.toFixed(2));
}

function storageGet(keys) {
  return new Promise((resolve) => {
    chrome.storage.local.get(keys, (result) => {
      if (chrome.runtime.lastError) {
        resolve({});
        return;
      }
      resolve(result);
    });
  });
}

function storageSet(values) {
  return new Promise((resolve) => {
    chrome.storage.local.set(values, () => {
      resolve();
    });
  });
}

function isVisible(video) {
  const rect = video.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) {
    return false;
  }

  const style = window.getComputedStyle(video);
  if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0) {
    return false;
  }

  const overlapWidth = Math.min(rect.right, window.innerWidth) - Math.max(rect.left, 0);
  const overlapHeight = Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0);
  return overlapWidth > 0 && overlapHeight > 0;
}

function visibleArea(video) {
  const rect = video.getBoundingClientRect();
  const overlapWidth = Math.min(rect.right, window.innerWidth) - Math.max(rect.left, 0);
  const overlapHeight = Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0);

  if (overlapWidth <= 0 || overlapHeight <= 0) {
    return 0;
  }

  return overlapWidth * overlapHeight;
}

function selectTargetVideo() {
  const videos = Array.from(document.querySelectorAll("video"));
  if (videos.length === 0) {
    return null;
  }

  const visibleVideos = videos.filter(isVisible);
  if (visibleVideos.length === 0) {
    return videos[0];
  }

  const playingVisible = visibleVideos.filter(
    (video) => !video.paused && !video.ended && video.readyState > 1
  );

  const pool = playingVisible.length > 0 ? playingVisible : visibleVideos;
  pool.sort((a, b) => visibleArea(b) - visibleArea(a));
  return pool[0] || null;
}

function applyRate(video, rate) {
  const nextRate = clampRate(rate, state.maxRate);
  const changed =
    Math.abs(video.playbackRate - nextRate) > 0.001 ||
    Math.abs(video.defaultPlaybackRate - nextRate) > 0.001;

  video.playbackRate = nextRate;
  video.defaultPlaybackRate = nextRate;

  if (changed) {
    console.log(`video speed = ${nextRate}`);
  }
}

function applyRateToTarget(rate = state.currentRate) {
  const video = selectTargetVideo();
  if (!video) {
    return { foundVideo: false, applied: false, rate: state.currentRate };
  }

  applyRate(video, rate);
  return { foundVideo: true, applied: true, rate: state.currentRate };
}

async function hydrateState() {
  const stored = await storageGet(["currentRate", "maxRate"]);
  const maxRate = normalizeMaxRate(stored.maxRate);
  const currentRate = clampRate(Number(stored.currentRate) || DEFAULT_RATE, maxRate);

  state.maxRate = maxRate;
  state.currentRate = currentRate;
}

async function persistState() {
  await storageSet({ currentRate: state.currentRate, maxRate: state.maxRate });
}

async function handleMessage(message) {
  if (!message || typeof message !== "object") {
    return { ok: false };
  }

  if (message.type === "GET_STATE") {
    await hydrateState();
    const result = applyRateToTarget(state.currentRate);
    return {
      ok: true,
      foundVideo: result.foundVideo,
      currentRate: state.currentRate,
      maxRate: state.maxRate
    };
  }

  if (message.type === "SET_RATE") {
    state.currentRate = clampRate(Number(message.rate) || DEFAULT_RATE, state.maxRate);
    await persistState();
    const result = applyRateToTarget(state.currentRate);
    return {
      ok: true,
      applied: result.applied,
      foundVideo: result.foundVideo,
      rate: state.currentRate
    };
  }

  if (message.type === "SET_MAX") {
    state.maxRate = normalizeMaxRate(message.maxRate);
    state.currentRate = clampRate(Number(message.rate) || state.currentRate, state.maxRate);
    await persistState();
    const result = applyRateToTarget(state.currentRate);
    return {
      ok: true,
      maxRate: state.maxRate,
      foundVideo: result.foundVideo,
      rate: state.currentRate
    };
  }

  return { ok: false };
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  void handleMessage(message).then(sendResponse);
  return true;
});

document.addEventListener(
  "play",
  (event) => {
    const target = event.target;
    if (target instanceof HTMLVideoElement) {
      applyRate(target, state.currentRate);
    }
  },
  true
);

let mutationTickScheduled = false;

function scheduleMutationRefresh() {
  if (mutationTickScheduled) {
    return;
  }

  mutationTickScheduled = true;
  requestAnimationFrame(() => {
    mutationTickScheduled = false;
    applyRateToTarget(state.currentRate);
  });
}

const observer = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    if (mutation.type !== "childList") {
      continue;
    }

    for (const node of mutation.addedNodes) {
      if (!(node instanceof Element)) {
        continue;
      }

      if (node.tagName === "VIDEO" || node.querySelector("video")) {
        scheduleMutationRefresh();
        return;
      }
    }
  }
});

if (document.documentElement) {
  observer.observe(document.documentElement, { childList: true, subtree: true });
}

void hydrateState().then(() => {
  applyRateToTarget(state.currentRate);
});
