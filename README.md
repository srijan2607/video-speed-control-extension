# Video Speed Control Extension

Minimal Chrome/Brave extension to control video playback speed from a tiny popup.

## Features

- Slider from `0.25x` up to selected max speed
- Max speed dropdown presets: `2x`, `3x`, `4x`
- Global persistence using `chrome.storage.local`
- Targets the active visible/main playing video on the tab
- Logs speed changes in page console: `video speed = X`

## Install (Unpacked)

1. Open Chrome or Brave.
2. Go to `chrome://extensions` (Brave uses the same page).
3. Enable **Developer mode**.
4. Click **Load unpacked**.
5. Select this folder: `video-speed-control-extension`.

## Usage

1. Open a tab with a video.
2. Click the extension icon.
3. Choose max speed (`2x`, `3x`, or `4x`).
4. Move the slider to your speed.

## Notes

- On pages with no videos, popup shows `No video found`.
- On restricted browser pages, popup shows `Unavailable on this page`.

## Repository

- URL: https://github.com/srijan2607/video-speed-control-extension
