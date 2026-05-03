# AGENTS.md

## Repository Rules

- This repo contains vBook extensions. When changing any extension runtime file, bump that extension version in both `<extension>/plugin.json` and the root `plugin.json` catalog entry.
- Rebuild `<extension>/plugin.zip` after every change to `<extension>/src/*.js` or `<extension>/plugin.json`.
- Use `C:\Users\hqson\.config\opencode\skills\vbook-extension-dev\scripts\package-vbook-plugin.ps1 -ExtensionDir <extension-dir>` to package zips. Do not use raw `Compress-Archive` output.
- Commit and push when the user asks to publish/update GitHub. Do not stop after local changes unless there is a blocker.
- Commit only files relevant to the requested extension and root catalog changes. Ignore unrelated dirty files unless the user asks about them.
- Never commit real cookies, JWTs, access tokens, account credentials, or private VIP auth values.

## iTruyenChu Notes

- Extension path: `itruyenchu/`.
- Source site: `https://itruyenchu.org/`.
- Public API base: `https://api.ngoctieucac.link`.
- Asset/data base: `https://assets.ngoctieucac.link`.
- Free chapters can come from `https://assets.ngoctieucac.link/free/<slug>/chuong-<number>.txt` and may be gzip-compressed.
- VIP chapters should not be blocked before trying authenticated page fetch. Try asset free first, then fetch the chapter page with auth-aware fetch.
- iTruyenChu login uses `localStorage` key `auth-storage`, not cookies. The browser sends `Authorization: Bearer <jwt>` to `https://api.ngoctieucac.link/auth/profile`.
- VIP chapter text uses `GET https://api.ngoctieucac.link/chapters/<slug>/content/<chapter>?platform=web` with Bearer auth. The response includes a signed text URL in `content`; fetch that URL and render the returned text.
- VIP auth should be supplied privately via vBook config as a Bearer token or raw JWT from `auth-storage`; do not hardcode the user's actual token in git.
- If the user says they are logged in inside vBook browser, still do not assume extension fetch sees browser localStorage; support private token config explicitly.
- Bump iTruyenChu version after runtime/package fixes so vBook refreshes cached plugin data.

## Current Known Dirty Files To Avoid Unless Requested

- `sstruyen/plugin.zip`
- `.mcp.json`
- `.opencode.json`
- `darkrai9x-vbook-extensions/`
