---
name: itruyenchu-scraper
description: Use this skill when downloading iTruyenChu chapters on the local Windows PC with the repository script, especially VIP chapters using a private Bearer token, slow single-threaded scraping, resumable output, and detailed progress logs.
version: 1.0.0
---

# iTruyenChu Scraper

Use the local script `scripts/itruyenchu_scraper.py` for iTruyenChu chapter downloads instead of the vBook extension path when the user asks to scrape/download chapters on the PC.

## Core Rules

- Keep scraping single-threaded only.
- Keep delay slow and polite; current script uses about `1.5-3s` between chapters.
- Show detailed progress/log output unless the user explicitly asks for quiet mode.
- Do not commit `.itc_token`, tokens, cookies, JWTs, or downloaded paid content.
- Prefer small test ranges first, e.g. 2-3 chapters, before large ranges.
- Use PowerShell UTF-8 env vars to avoid Vietnamese console encoding issues.

## Token Handling

Token lookup order in the script:

1. `--token <jwt>` CLI argument
2. `ITC_TOKEN` environment variable
3. Repo-root `.itc_token` file

Use `.itc_token` for local convenience, but never stage or commit it. The script strips UTF-8 BOM from token values.

## Commands

Run from repo root:

```powershell
$env:PYTHONUTF8 = "1"; $env:PYTHONIOENCODING = "utf-8"; python scripts/itruyenchu_scraper.py <slug> --start <first> --end <last>
```

Single chapter:

```powershell
$env:PYTHONUTF8 = "1"; $env:PYTHONIOENCODING = "utf-8"; python scripts/itruyenchu_scraper.py <slug> --chapter <number>
```

Full book:

```powershell
$env:PYTHONUTF8 = "1"; $env:PYTHONIOENCODING = "utf-8"; python scripts/itruyenchu_scraper.py <slug> --all
```

Example from prior successful run:

```powershell
$env:PYTHONUTF8 = "1"; $env:PYTHONIOENCODING = "utf-8"; python scripts/itruyenchu_scraper.py thon-thien-ky --start 1819 --end 1829
```

## Output

Files are saved under `downloads/` by default using:

```text
<slug>_chuong-####.txt
```

The script is resumable: existing non-empty files are skipped.

## Verification

After a run, read one downloaded file to confirm Vietnamese text is intact:

```powershell
Get-ChildItem downloads -Filter "<slug>_chuong-*.txt"
```

Use the Read tool on one output file for content validation.

## Known Fixes

- Use `resp.content` plus manual UTF-8 decode for VIP API JSON.
- Strip UTF-8 BOM from `.itc_token` tokens.
- Fetch VIP flow: API endpoint returns signed S3 URL in `content`; then download S3 `.txt`, gunzip if needed, decode UTF-8.
