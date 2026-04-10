// ==UserScript==
// @name         NgocTieuCac Downloader
// @namespace    https://ngoctieucac.com/
// @version      1.0
// @description  Tải toàn bộ nội dung truyện từ ngoctieucac.com
// @author       sonzin
// @match        https://ngoctieucac.com/truyen/*
// @match        https://www.ngoctieucac.com/truyen/*
// @exclude      https://ngoctieucac.com/truyen/*/chuong-*
// @exclude      https://www.ngoctieucac.com/truyen/*/chuong-*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    const DELAY_MS = 800;       // Delay between chapter fetches
    const MAX_RETRIES = 2;
    const CHAPTERS_PER_PAGE = 10;

    // ==================== UI ====================
    function createUI() {
        // Find "Đọc truyện" or "Mượn Ebook" button
        const allBtns = document.querySelectorAll('a, button');
        const readBtn = Array.from(allBtns).find(el => {
            const t = el.innerText.trim();
            return t.includes('Đọc truyện') || t.includes('Mượn Ebook');
        });

        if (!readBtn) {
            console.log('[NTC DL] Chưa thấy nút, thử lại...');
            setTimeout(createUI, 2000);
            return;
        }

        // Don't add if already exists
        if (document.getElementById('ntc-download-btn')) return;

        const btn = document.createElement('button');
        btn.id = 'ntc-download-btn';
        btn.innerHTML = '📥 Tải truyện';
        btn.className = readBtn.className;
        btn.style.cssText = `
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
            color: white !important;
            border: none !important;
            cursor: pointer !important;
        `;

        // Insert after the button container
        const parent = readBtn.parentElement;
        if (parent) {
            parent.appendChild(btn);
        }

        // Progress panel
        const progress = document.createElement('div');
        progress.id = 'ntc-progress';
        progress.style.cssText = 'display:none; background:rgba(0,0,0,0.9); color:white; padding:16px 20px; border-radius:12px; margin-top:12px; font-family:sans-serif; width:100%; box-sizing:border-box;';
        progress.innerHTML = `
            <div id="ntc-title" style="font-weight:700;margin-bottom:8px;font-size:14px">Đang tải...</div>
            <div style="background:rgba(255,255,255,0.15);border-radius:8px;height:8px;overflow:hidden;margin-bottom:8px">
                <div id="ntc-bar" style="background:linear-gradient(90deg,#667eea,#764ba2);height:100%;width:0%;border-radius:8px;transition:width 0.3s"></div>
            </div>
            <div id="ntc-text" style="font-size:13px;color:rgba(255,255,255,0.8)"></div>
            <div id="ntc-log" style="font-size:11px;color:rgba(255,255,255,0.5);margin-top:4px;max-height:60px;overflow:hidden"></div>
        `;

        // Find a good place to insert the progress - after the button row's parent
        const sectionParent = parent.closest('div') || parent;
        sectionParent.parentElement.insertBefore(progress, sectionParent.nextSibling);

        btn.addEventListener('click', startDownload);
        console.log('[NTC DL] ✅ Sẵn sàng!');
    }

    function showProgress(current, total, text, log) {
        const p = document.getElementById('ntc-progress');
        if (!p) return;
        p.style.display = 'block';
        const pct = total > 0 ? Math.round((current / total) * 100) : 0;
        document.getElementById('ntc-bar').style.width = pct + '%';
        if (text) document.getElementById('ntc-text').textContent = text;
        else document.getElementById('ntc-text').textContent = `${current}/${total} (${pct}%)`;
        if (log) document.getElementById('ntc-log').textContent = log;
    }

    // ==================== MAIN ====================

    async function startDownload() {
        const btn = document.getElementById('ntc-download-btn');
        btn.disabled = true;
        btn.textContent = '⏳ Đang xử lý...';

        try {
            // Get story title
            const title = document.querySelector('h1')?.innerText?.trim() || 'truyen';
            showProgress(0, 0, 'Bước 1: Lấy danh sách chương...');

            // Step 1: Collect all chapters from paginated list
            const chapters = await collectAllChapters();
            if (!chapters.length) {
                alert('Không tìm thấy chương nào!');
                btn.disabled = false;
                btn.textContent = '📥 Tải truyện';
                return;
            }

            console.log(`[NTC DL] Tìm thấy ${chapters.length} chương`);

            // Step 2: Fetch content for each chapter
            document.getElementById('ntc-title').textContent = `Bước 2: Tải nội dung ${chapters.length} chương...`;
            let fullText = title + '\n' + '='.repeat(title.length) + '\n\n';
            let okCount = 0, failCount = 0;

            for (let i = 0; i < chapters.length; i++) {
                const ch = chapters[i];
                showProgress(i + 1, chapters.length, null, ch.name);

                let content = null;
                for (let r = 0; r < MAX_RETRIES; r++) {
                    content = await fetchChapterContent(ch.url);
                    if (content && content.length > 100) break;
                    content = null;
                    await sleep(500);
                }

                fullText += ch.name + '\n' + '-'.repeat(ch.name.length) + '\n\n';
                if (content) {
                    fullText += content + '\n\n\n';
                    okCount++;
                } else {
                    fullText += '[Không tải được nội dung chương này]\n\n\n';
                    failCount++;
                }

                if (i < chapters.length - 1) await sleep(DELAY_MS);
            }

            // Step 3: Download
            downloadFile(fullText, sanitize(title) + '.txt');
            showProgress(chapters.length, chapters.length,
                `✅ Hoàn tất! ${okCount} thành công, ${failCount} thất bại.`);

        } catch (err) {
            alert('Lỗi: ' + err.message);
            console.error(err);
        }

        btn.disabled = false;
        btn.textContent = '📥 Tải truyện';
    }

    // ==================== COLLECT CHAPTERS ====================

    async function collectAllChapters() {
        const all = [];
        const seen = new Set();

        // Get current page URL (story detail page)
        const storyUrl = window.location.href.split('?')[0];

        // Extract total chapters from heading "Danh Sách Chương (N)"
        let totalChapters = 0;
        const headings = document.querySelectorAll('h2, h3');
        for (const h of headings) {
            const text = h.textContent;
            const match = text.match(/\((\d+)\)/);
            if (match && text.includes('Chương')) {
                totalChapters = parseInt(match[1]);
                break;
            }
        }

        const totalPages = totalChapters > 0 ? Math.ceil(totalChapters / CHAPTERS_PER_PAGE) : 1;
        console.log(`[NTC DL] Tổng: ${totalChapters} chương, ${totalPages} trang`);

        // Scrape page 1 from current DOM
        scrapeChaptersFromDOM(document, all, seen);
        console.log(`[NTC DL] Trang 1: ${all.length} chương`);

        // Fetch remaining pages
        for (let page = 2; page <= totalPages; page++) {
            showProgress(page, totalPages, `Lấy danh sách chương trang ${page}/${totalPages}...`);

            try {
                const pageUrl = storyUrl + '?page=' + page;
                const resp = await fetch(pageUrl);
                if (resp.ok) {
                    const html = await resp.text();
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(html, 'text/html');
                    const before = all.length;
                    scrapeChaptersFromDOM(doc, all, seen);
                    console.log(`[NTC DL] Trang ${page}: +${all.length - before} chương (tổng: ${all.length})`);
                }
            } catch (e) {
                console.warn(`[NTC DL] Lỗi trang ${page}:`, e);
            }

            await sleep(300);
        }

        // Sort by chapter number
        all.sort((a, b) => {
            const na = parseInt((a.url.match(/chuong-(\d+)/) || [0, 0])[1]) || 0;
            const nb = parseInt((b.url.match(/chuong-(\d+)/) || [0, 0])[1]) || 0;
            return na - nb;
        });

        return all;
    }

    function scrapeChaptersFromDOM(doc, list, seen) {
        doc.querySelectorAll('a[href*="/chuong-"]').forEach(a => {
            const href = a.getAttribute('href');
            if (!href) return;

            // Get chapter name from the span or text content
            let name = '';
            const span = a.querySelector('span');
            if (span) {
                name = span.textContent.trim();
            } else {
                name = a.textContent.trim();
            }

            if (!name) return;
            // Must contain "Chương" to filter out non-chapter links like "Đọc truyện"
            if (!name.includes('Chương') && !name.includes('chương')) return;
            // Must end with /chuong-N
            if (!href.match(/\/chuong-\d+$/)) return;

            if (seen.has(href)) return;
            seen.add(href);
            list.push({ name, url: href });
        });
    }

    // ==================== FETCH CHAPTER CONTENT ====================

    async function fetchChapterContent(chapterUrl) {
        try {
            const fullUrl = chapterUrl.startsWith('http') ? chapterUrl : 'https://ngoctieucac.com' + chapterUrl;
            const resp = await fetch(fullUrl);

            if (!resp.ok) return null;

            const html = await resp.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');

            // Primary selector: div.space-y-3 (same as extension chap.js)
            let contentEl = doc.querySelector('div.space-y-3');
            if (contentEl) {
                // Remove junk elements
                contentEl.querySelectorAll('script, ins, iframe').forEach(e => e.remove());
                const text = contentEl.innerText?.trim() || contentEl.textContent?.trim();
                if (text && text.length > 100) return cleanText(text);
            }

            // Fallback: all p.leading-relaxed
            const paragraphs = doc.querySelectorAll('p.leading-relaxed');
            if (paragraphs.length > 0) {
                let text = Array.from(paragraphs).map(p => p.textContent.trim()).join('\n\n');
                if (text.length > 100) return cleanText(text);
            }

            // Last resort: common selectors
            const fallbacks = ['.chapter-content', '#chapter-content', '#content', '.reading-content'];
            for (const sel of fallbacks) {
                const el = doc.querySelector(sel);
                if (el) {
                    el.querySelectorAll('script, ins, iframe').forEach(e => e.remove());
                    const text = el.innerText?.trim() || el.textContent?.trim();
                    if (text && text.length > 100) return cleanText(text);
                }
            }

            return null;
        } catch (e) {
            console.warn('[NTC DL] Lỗi fetch chương:', e);
            return null;
        }
    }

    // ==================== UTILS ====================

    function cleanText(t) {
        return t.replace(/\t/g, ' ').replace(/ {2,}/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
    }
    function sanitize(n) {
        return n.replace(/[\\/:*?"<>|]/g, '-').replace(/\s+/g, ' ').trim();
    }
    function downloadFile(text, filename) {
        const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = filename;
        document.body.appendChild(a); a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
    function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

    // ==================== INIT ====================
    // Only run on story detail pages (not chapter pages)
    const path = window.location.pathname;
    if (path.match(/\/truyen\/[^/]+$/) || path.match(/\/truyen\/[^/]+\/$/)) {
        if (document.readyState === 'complete') {
            setTimeout(createUI, 1500);
        } else {
            window.addEventListener('load', () => setTimeout(createUI, 1500));
        }
    }

})();
