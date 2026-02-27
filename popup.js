const MIN_RATE = 0.25;
const STEP = 0.25;
const DEFAULT_RATE = 1;
const DEFAULT_MAX_RATE = 2;
const ALLOWED_MAX_RATES = [2, 3, 4];

const maxRateEl = document.getElementById("maxRate");
const rateEl = document.getElementById("rate");
const rateValueEl = document.getElementById("rateValue");
const statusEl = document.getElementById("status");

function clampRate(rate, maxRate) {
  const rounded = Math.round(rate / STEP) * STEP;
  const clamped = Math.min(Math.max(rounded, MIN_RATE), maxRate);
  return Number(clamped.toFixed(2));
}

function normalizeMaxRate(value) {
  const parsed = Number(value);
  return ALLOWED_MAX_RATES.includes(parsed) ? parsed : DEFAULT_MAX_RATE;
}

function setStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.classList.toggle("error", isError);
}

function setControlsDisabled(disabled) {
  maxRateEl.disabled = disabled;
  rateEl.disabled = disabled;
}

function formatRate(rate) {
  return `${Number(rate.toFixed(2))}x`;
}

function updateRateUi(rate, maxRate) {
  rateEl.max = String(maxRate);
  rateEl.value = String(rate);
  rateValueEl.textContent = formatRate(rate);
}

function storageGet(keys) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(keys, (result) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve(result);
    });
  });
}

function storageSet(values) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set(values, () => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve();
    });
  });
}

async function getActiveTab() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs[0];
}

async function sendMessageToActiveTab(message) {
  const tab = await getActiveTab();
  if (!tab || typeof tab.id !== "number") {
    return { ok: false, unavailable: true };
  }

  return new Promise((resolve) => {
    chrome.tabs.sendMessage(tab.id, message, (response) => {
      if (chrome.runtime.lastError) {
        resolve({ ok: false, unavailable: true, error: chrome.runtime.lastError.message });
        return;
      }
      resolve(response || { ok: false });
    });
  });
}

async function loadSettings() {
  const stored = await storageGet(["currentRate", "maxRate"]);
  const maxRate = normalizeMaxRate(stored.maxRate);
  const currentRate = clampRate(Number(stored.currentRate) || DEFAULT_RATE, maxRate);
  return { currentRate, maxRate };
}

async function saveSettings(currentRate, maxRate) {
  await storageSet({ currentRate, maxRate });
}

async function applyRateFromUi() {
  const maxRate = normalizeMaxRate(maxRateEl.value);
  const rate = clampRate(Number(rateEl.value), maxRate);

  updateRateUi(rate, maxRate);
  await saveSettings(rate, maxRate);

  const response = await sendMessageToActiveTab({ type: "SET_RATE", rate });
  if (!response || response.unavailable) {
    setStatus("Unavailable on this page", true);
    setControlsDisabled(true);
    return;
  }

  if (!response.foundVideo) {
    setStatus("No video found");
    return;
  }

  setStatus("");
}

async function applyMaxRateFromUi() {
  const maxRate = normalizeMaxRate(maxRateEl.value);
  const rate = clampRate(Number(rateEl.value), maxRate);

  updateRateUi(rate, maxRate);
  await saveSettings(rate, maxRate);

  const response = await sendMessageToActiveTab({
    type: "SET_MAX",
    maxRate,
    rate
  });

  if (!response || response.unavailable) {
    setStatus("Unavailable on this page", true);
    setControlsDisabled(true);
    return;
  }

  if (!response.foundVideo) {
    setStatus("No video found");
    return;
  }

  setStatus("");
}

async function initializePopup() {
  try {
    setControlsDisabled(false);
    setStatus("");

    const { currentRate, maxRate } = await loadSettings();
    maxRateEl.value = String(maxRate);
    updateRateUi(currentRate, maxRate);

    const state = await sendMessageToActiveTab({ type: "GET_STATE" });

    if (!state || state.unavailable) {
      setStatus("Unavailable on this page", true);
      setControlsDisabled(true);
      return;
    }

    if (!state.foundVideo) {
      setStatus("No video found");
    } else {
      setStatus("");
    }
  } catch (error) {
    console.error(error);
    setStatus("Could not initialize", true);
    setControlsDisabled(true);
  }
}

rateEl.addEventListener("input", () => {
  const maxRate = normalizeMaxRate(maxRateEl.value);
  const rate = clampRate(Number(rateEl.value), maxRate);
  rateValueEl.textContent = formatRate(rate);
});

rateEl.addEventListener("change", () => {
  void applyRateFromUi();
});

maxRateEl.addEventListener("change", () => {
  void applyMaxRateFromUi();
});

void initializePopup();
