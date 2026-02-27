# Testing Checklist

Date: 2026-02-27

## Static Validation

- [x] `node --check popup.js`
- [x] `node --check content.js`
- [x] `jq . manifest.json` (valid JSON)
- [x] `Google Chrome --pack-extension=...` (extension package generation succeeded)

## Manual Smoke Tests (Chrome)

- [ ] Single video speed change to `1.5x`
- [ ] Console shows `video speed = 1.5`
- [ ] Dropdown max changes slider limit (`2x -> 4x`)
- [ ] Clamp behavior when lowering max speed
- [ ] Multi-video page controls active visible/main playing video
- [ ] No-video page shows `No video found`
- [ ] Restricted page shows `Unavailable on this page`
- [ ] Persistence across tabs/reloads

## Manual Smoke Tests (Brave)

- [ ] Single video speed change to `1.5x`
- [ ] Console shows `video speed = 1.5`
- [ ] Dropdown max changes slider limit (`2x -> 4x`)
- [ ] Clamp behavior when lowering max speed
- [ ] Multi-video page controls active visible/main playing video
- [ ] No-video page shows `No video found`
- [ ] Restricted page shows `Unavailable on this page`
- [ ] Persistence across tabs/reloads

## Results

- Static checks: **PASS**.
- Packaging/loadability sanity via Chrome pack command: **PASS**.
- Full manual browser smoke suite: **NOT RUN in this terminal-only session**; checklist retained for immediate run in Chrome and Brave.
