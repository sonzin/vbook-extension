#!/usr/bin/env python3
"""
iTruyenChu Book Scraper
Downloads all chapters of a book, supporting VIP chapters via Bearer token.
Usage:
    python itruyenchu_scraper.py <slug> [--start N] [--end N] [--token TOKEN]
    python itruyenchu_scraper.py <slug> --chapter N  [--token TOKEN]
"""

import sys, os, json, gzip, time, argparse, textwrap
from pathlib import Path
from datetime import datetime, timedelta

import requests

# ── Constants ──────────────────────────────────────────────────────────
API_URL    = "https://api.ngoctieucac.link"
DATA_URL   = "https://assets.ngoctieucac.link"
BASE_URL   = "https://itruyenchu.org"
UA         = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
SLEEP_MIN  = 1.5          # delay between chapters (seconds) – feel free to increase
SLEEP_MAX  = 3.0
# ───────────────────────────────────────────────────────────────────────

# ── small helpers ─────────────────────────────────────────────────────
def ts() -> str:
    """Return a human-readable timestamp for log lines."""
    return datetime.now().strftime("%H:%M:%S")

def log(msg: str, level: str = "INFO"):
    """Nice prefixed logger."""
    print(f"[{ts()}] [{level:>5}] {msg}", flush=True)

def warn(msg: str):
    log(msg, "WARN")

def success(msg: str):
    log(msg, "OK")

# ── token loading ─────────────────────────────────────────────────────
def load_token(token_arg: str = None) -> str:
    """Look for token in args > env > .itc_token file."""
    if token_arg:
        return token_arg.strip()
    env_token = os.environ.get("ITC_TOKEN", "").strip()
    if env_token:
        return env_token
    token_file = Path(__file__).resolve().parent.parent / ".itc_token"
    if token_file.exists():
        return token_file.read_text("utf-8").strip()
    return ""

# ── API helpers ───────────────────────────────────────────────────────
def api_headers(token: str) -> dict:
    h = {"User-Agent": UA}
    if token:
        h["Authorization"] = f"Bearer {token}"
    return h

def api_get(url: str, token: str = "") -> requests.Response:
    resp = requests.get(url, headers=api_headers(token), timeout=30)
    resp.raise_for_status()
    resp.encoding = "utf-8"  # force UTF-8 – API may have BOM
    return resp

def api_get_json(url: str, token: str = "") -> dict:
    return api_get(url, token).json()

# ── fetching content ──────────────────────────────────────────────────
def try_free_asset(slug: str, ch: int) -> str | None:
    """Download /free/<slug>/chuong-<ch>.txt ; ungzip if needed."""
    free_url = f"{DATA_URL}/free/{slug}/chuong-{ch}.txt"
    try:
        resp = requests.get(free_url, headers={"User-Agent": UA}, timeout=20)
        if not resp.ok:
            return None
        data = resp.content
        if data[:2] == b"\x1f\x8b":
            data = gzip.decompress(data)
        return data.decode("utf-8")
    except Exception:
        return None

def fetch_vip_chapter(slug: str, ch: int, token: str) -> str | None:
    """Auth-only flow: call API → get signed S3 URL → download & ungzip."""
    api_ch_url = f"{API_URL}/chapters/{slug}/content/{ch}?platform=web"
    try:
        resp = api_get(api_ch_url, token)
        payload = resp.json()
        signed_url = payload.get("content")
        if not signed_url:
            log(f"  └─ API returned no 'content' field. Raw keys: {list(payload.keys())}", "WARN")
            return None
        log(f"  └─ Signed URL → {signed_url[:70]}...")

        # download gzip txt from S3
        s3_resp = requests.get(signed_url, headers={"User-Agent": UA}, timeout=60)
        s3_resp.raise_for_status()
        data = s3_resp.content
        if data[:2] == b"\x1f\x8b":
            data = gzip.decompress(data)
        return data.decode("utf-8")
    except requests.HTTPError as e:
        log(f"  └─ HTTP error {e.response.status_code} → {e}", "WARN")
        return None
    except Exception as e:
        log(f"  └─ Unexpected error: {e}", "WARN")
        return None

# ── book metadata ─────────────────────────────────────────────────────
def get_book_info(slug: str) -> dict:
    return api_get_json(f"{API_URL}/books/{slug}")

# ── saving ────────────────────────────────────────────────────────────
def save_chapter(text: str, slug: str, ch: int, out_dir: Path):
    out_dir.mkdir(parents=True, exist_ok=True)
    fname = f"{slug}_chuong-{ch:04d}.txt"
    path = out_dir / fname
    path.write_text(text, encoding="utf-8")
    log(f"  └─ Saved → {path}")

# ── progress bar (simple text) ────────────────────────────────────────
def progress_bar(current: int, total: int, width: int = 30):
    if total == 0:
        return ""
    pct = current / total
    filled = int(width * pct)
    bar = "█" * filled + "░" * (width - filled)
    return f"[{bar}] {current}/{total} ({pct:.0%})"

# ── resume support ────────────────────────────────────────────────────
def already_downloaded(slug: str, ch: int, out_dir: Path) -> bool:
    fname = f"{slug}_chuong-{ch:04d}.txt"
    path = out_dir / fname
    if path.exists():
        # quick sanity: file not empty
        return path.stat().st_size > 0
    return False

# ══════════════════════════════════════════════════════════════════════
def download_range(slug: str, start: int, end: int, token: str, out_dir: Path):
    """Download chapters start..end (inclusive)."""
    total = end - start + 1
    log(f"Downloading chapters {start} → {end}  ({total} chapters)")
    log(f"Output directory: {out_dir.resolve()}")
    log(f"VIP token: {'*'*20} (loaded)" if token else "VIP token: MISSING")
    print()

    downloaded, free_cnt, vip_cnt, skipped_cnt, fail_cnt = 0, 0, 0, 0, 0
    t_start = time.monotonic()

    for ch in range(start, end + 1):
        pbar = progress_bar(downloaded, total)
        log(f"Chapter {ch:<6} {pbar}")

        # skip if already on disk
        if already_downloaded(slug, ch, out_dir):
            log(f"  └─ ⏭  Already downloaded → skip", "INFO")
            downloaded += 1
            skipped_cnt += 1
            # still apply a tiny rest between chapters
            time.sleep(SLEEP_MIN)
            continue

        # 1) try free asset
        text = try_free_asset(slug, ch)
        if text is not None:
            save_chapter(text, slug, ch, out_dir)
            downloaded += 1
            free_cnt += 1
            log(f"  └─ ✅ Free asset")
        else:
            # 2) try VIP
            if not token:
                warn(f"  └─ ❌ No token – cannot download VIP chapter")
                fail_cnt += 1
                downloaded += 1
                time.sleep(SLEEP_MIN)
                continue
            log(f"  └─ 🔒 VIP → fetching via API …")
            text = fetch_vip_chapter(slug, ch, token)
            if text is not None:
                save_chapter(text, slug, ch, out_dir)
                downloaded += 1
                vip_cnt += 1
                log(f"  └─ ✅ VIP fetched")
            else:
                warn(f"  └─ ❌ Failed to get VIP content")
                fail_cnt += 1
                downloaded += 1

        # polite delay
        delay = SLEEP_MIN + (SLEEP_MAX - SLEEP_MIN) * (1.0 * (downloaded % 17) / 17)
        time.sleep(delay)

        # summary every 20 chapters
        if downloaded % 20 == 0:
            elapsed = timedelta(seconds=int(time.monotonic() - t_start))
            success(f"Progress: {downloaded}/{total} done | free={free_cnt} vip={vip_cnt} skip={skipped_cnt} fail={fail_cnt} | elapsed {elapsed}")

    elapsed = timedelta(seconds=int(time.monotonic() - t_start))
    print()
    success(f"DONE! {downloaded}/{total} chapters processed in {elapsed}")
    print(f"       Free={free_cnt}  VIP={vip_cnt}  Skipped={skipped_cnt}  Failed={fail_cnt}")
    print(f"       Files saved to: {out_dir.resolve()}")

# ══════════════════════════════════════════════════════════════════════
def main():
    parser = argparse.ArgumentParser(
        description="iTruyenChu book scraper – 1 thread, polite speed, resumable",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=textwrap.dedent("""\
            examples:
              python itruyenchu_scraper.py ta-la-dai-than-ton
              python itruyenchu_scraper.py ta-la-dai-than-ton --start 1500 --end 1510
              python itruyenchu_scraper.py ta-la-dai-than-ton --chapter 1499 --token eyJ...
        """),
    )
    parser.add_argument("slug", help="Book slug (URL path after /truyen/)")
    parser.add_argument("--chapter", type=int, help="Download a single chapter")
    parser.add_argument("--start", type=int, help="First chapter to download")
    parser.add_argument("--end", type=int, help="Last chapter to download")
    parser.add_argument("--all", action="store_true", help="Download ALL chapters of the book")
    parser.add_argument("--token", help="Bearer token (or set ITC_TOKEN env / .itc_token file)")
    parser.add_argument("-o", "--output", default="downloads",
                        help="Output directory (default: downloads/)")
    args = parser.parse_args()

    # resolve token
    token = load_token(args.token)
    if not token:
        log("No token provided – VIP chapters will be skipped.", "WARN")

    # resolve output dir
    out_dir = Path(args.output).resolve()
    log(f"Output directory: {out_dir}")

    # fetch book info to know total chapters
    log(f"Fetching book info for slug={args.slug} …")
    try:
        book = get_book_info(args.slug)
    except Exception as e:
        log(f"Failed to fetch book info: {e}", "FATAL")
        sys.exit(1)

    title  = book.get("title", args.slug)
    total_ch = int(book.get("currentChapter", 0))
    lock_ch  = int(book.get("lockChapters", 50))
    is_free  = book.get("isFree", False)
    log(f"Book: {title}")
    log(f"Total chapters (API): {total_ch}  |  Lock after: {lock_ch}")
    log(f"isFree: {is_free}")

    if total_ch == 0:
        log("Book has 0 chapters – nothing to download.", "FATAL")
        sys.exit(0)

    # determine range
    if args.chapter:
        start = end = args.chapter
    elif args.all:
        start = 1
        end = total_ch
    else:
        start = args.start or 1
        end = args.end or total_ch

    # sanity checks
    if start < 1:
        start = 1
    if end > total_ch:
        end = total_ch
    if start > end:
        log(f"Invalid range: start={start} > end={end}", "FATAL")
        sys.exit(1)

    download_range(args.slug, start, end, token, out_dir)


if __name__ == "__main__":
    main()
