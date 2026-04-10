// ==UserScript==
// @name         TiemTruyenChu Downloader
// @namespace    https://tiemtruyenchu.com/
// @version      1.0
// @description  Tải toàn bộ nội dung truyện từ tiemtruyenchu.com
// @author       sonzin
// @match        https://tiemtruyenchu.com/truyen/*
// @match        https://www.tiemtruyenchu.com/truyen/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    const BASE_URL = 'https://www.tiemtruyenchu.com';
    const DELAY_MS = 800;
    const MAX_RETRIES = 2;
    const CHAPTERS_PER_PAGE = 50;

    // ==================== UI ====================
    function createUI() {
        // Find "Đọc truyện" button (btn-action or btnReadStory)
        const readBtn = document.getElementById('btnReadStory')
            || Array.from(document.querySelectorAll('a.btn, button.btn')).find(el =>
                el.innerText.trim().includes('Đọc truyện'));

        if (!readBtn) {
            console.log('[TTC DL] Chưa thấy nút Đọc truyện, thử lại...');
            setTimeout(createUI, 2000);
            return;
        }

        if (document.getElementById('ttc-download-btn')) return;

        const btn = document.createElement('button');
        btn.id = 'ttc-download-btn';
        btn.innerHTML = '📥 Tải truyện';
        btn.className = readBtn.className.replace(/btn-danger/g, 'btn-primary');
        btn.style.cssText = `
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
            color: white !important;
            border: none !important;
            cursor: pointer !important;
            margin-left: 8px !important;
        `;

        // Insert after the read button
        readBtn.parentElement.insertBefore(btn, readBtn.nextSibling);

        // Progress panel
        const progress = document.createElement('div');
        progress.id = 'ttc-progress';
        progress.style.cssText = 'display:none; background:rgba(0,0,0,0.9); color:white; padding:16px 20px; border-radius:12px; margin-top:12px; font-family:sans-serif; width:100%; box-sizing:border-box;';
        progress.innerHTML = `
            <div id="ttc-title" style="font-weight:700;margin-bottom:8px;font-size:14px">Đang tải...</div>
            <div style="background:rgba(255,255,255,0.15);border-radius:8px;height:8px;overflow:hidden;margin-bottom:8px">
                <div id="ttc-bar" style="background:linear-gradient(90deg,#667eea,#764ba2);height:100%;width:0%;border-radius:8px;transition:width 0.3s"></div>
            </div>
            <div id="ttc-text" style="font-size:13px;color:rgba(255,255,255,0.8)"></div>
            <div id="ttc-log" style="font-size:11px;color:rgba(255,255,255,0.5);margin-top:4px;max-height:60px;overflow:hidden"></div>
        `;

        // Insert progress panel after the button row
        const container = readBtn.closest('.mb-3') || readBtn.closest('div');
        if (container && container.parentElement) {
            container.parentElement.insertBefore(progress, container.nextSibling);
        } else {
            readBtn.parentElement.appendChild(progress);
        }

        btn.addEventListener('click', startDownload);
        console.log('[TTC DL] ✅ Sẵn sàng!');
    }

    function showProgress(current, total, text, log) {
        const p = document.getElementById('ttc-progress');
        if (!p) return;
        p.style.display = 'block';
        const pct = total > 0 ? Math.round((current / total) * 100) : 0;
        document.getElementById('ttc-bar').style.width = pct + '%';
        if (text) document.getElementById('ttc-text').textContent = text;
        else document.getElementById('ttc-text').textContent = `${current}/${total} (${pct}%)`;
        if (log) document.getElementById('ttc-log').textContent = log;
    }

    // ==================== MAIN ====================

    async function startDownload() {
        const btn = document.getElementById('ttc-download-btn');
        btn.disabled = true;
        btn.textContent = '⏳ Đang xử lý...';

        try {
            // Get story title
            const titleEl = document.querySelector('.story-title') || document.querySelector('h1');
            const title = titleEl?.innerText?.trim() || 'truyen';
            showProgress(0, 0, 'Bước 1: Lấy danh sách chương...');

            // Step 1: Collect all chapters
            const chapters = await collectAllChapters();
            if (!chapters.length) {
                alert('Không tìm thấy chương nào!');
                btn.disabled = false;
                btn.textContent = '📥 Tải truyện';
                return;
            }

            console.log(`[TTC DL] Tìm thấy ${chapters.length} chương`);

            // Step 2: Fetch content for each chapter
            document.getElementById('ttc-title').textContent = `Bước 2: Tải nội dung ${chapters.length} chương...`;
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

        const storyUrl = window.location.href.split('?')[0].split('#')[0];

        // Determine total pages from pagination
        let totalPages = getTotalPagesFromDOM();
        console.log(`[TTC DL] Phát hiện ${totalPages} trang chương từ DOM`);

        // Scrape page 1 from current DOM
        scrapeChaptersFromDOM(document, all, seen);
        console.log(`[TTC DL] Trang 1: ${all.length} chương`);

        // If we didn't find pagination, try fetching the chapter list tab
        if (totalPages <= 1 && all.length === 0) {
            // Might need to click the chapter list tab first
            const chapTab = document.querySelector('a[href="#chapter-list"]') ||
                Array.from(document.querySelectorAll('.nav-link, .tab-link')).find(el =>
                    el.innerText.includes('Danh sách chương'));
            if (chapTab) {
                chapTab.click();
                await sleep(1000);
                scrapeChaptersFromDOM(document, all, seen);
                totalPages = getTotalPagesFromDOM();
            }
        }

        // Fetch remaining pages
        for (let page = 2; page <= totalPages; page++) {
            showProgress(page, totalPages, `Lấy danh sách chương trang ${page}/${totalPages}...`);

            try {
                const separator = storyUrl.includes('?') ? '&' : '?';
                const pageUrl = storyUrl + separator + 'page=' + page;
                const resp = await fetch(pageUrl);
                if (resp.ok) {
                    const html = await resp.text();
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(html, 'text/html');
                    const before = all.length;
                    scrapeChaptersFromDOM(doc, all, seen);
                    console.log(`[TTC DL] Trang ${page}: +${all.length - before} chương (tổng: ${all.length})`);
                }
            } catch (e) {
                console.warn(`[TTC DL] Lỗi trang ${page}:`, e);
            }

            await sleep(300);
        }

        // Sort by chapter number
        all.sort((a, b) => {
            const na = extractChapterNum(a.url);
            const nb = extractChapterNum(b.url);
            return na - nb;
        });

        return all;
    }

    function getTotalPagesFromDOM() {
        let maxPage = 1;

        // Check Bootstrap pagination
        document.querySelectorAll('.pagination .page-link, .pagination a').forEach(el => {
            const href = el.getAttribute('href') || '';
            const pageMatch = href.match(/page=(\d+)/);
            if (pageMatch) {
                const n = parseInt(pageMatch[1]);
                if (n > maxPage) maxPage = n;
            }

            // Also check text content for numbered pages
            const text = el.textContent.trim();
            if (/^\d+$/.test(text)) {
                const n = parseInt(text);
                if (n > maxPage && n < 10000) maxPage = n;
            }
        });

        // Also try aria-label for "Trang N"
        document.querySelectorAll('[aria-label*="Trang"]').forEach(el => {
            const m = el.getAttribute('aria-label').match(/Trang\s+(\d+)/);
            if (m) {
                const n = parseInt(m[1]);
                if (n > maxPage) maxPage = n;
            }
        });

        return maxPage;
    }

    function scrapeChaptersFromDOM(doc, list, seen) {
        // Primary: #chapter-list-container
        let links = doc.querySelectorAll('#chapter-list-container a');

        // Fallback selectors
        if (links.length === 0) {
            links = doc.querySelectorAll('.chapter-list a[href*="chuong"], .chapter-list a[href*="doc-truyen"]');
        }
        if (links.length === 0) {
            links = doc.querySelectorAll('a.chapter-item-link');
        }
        if (links.length === 0) {
            links = doc.querySelectorAll('a[href*="/doc-truyen/"]');
        }

        links.forEach(a => {
            const href = a.getAttribute('href');
            if (!href) return;

            let name = a.textContent.trim();
            if (!name) return;

            // Normalize the URL
            const fullHref = href.startsWith('http') ? new URL(href).pathname : href;
            if (seen.has(fullHref)) return;
            seen.add(fullHref);

            list.push({ name, url: href });
        });
    }

    function extractChapterNum(url) {
        const m = url.match(/chuong[/-](\d+)/);
        return m ? parseInt(m[1]) : 0;
    }

    // ==================== FETCH CHAPTER CONTENT ====================

    async function fetchChapterContent(chapterUrl) {
        try {
            const fullUrl = chapterUrl.startsWith('http') ? chapterUrl : BASE_URL + chapterUrl;
            const resp = await fetch(fullUrl);

            if (!resp.ok) return null;

            const html = await resp.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');

            // Primary: .chapter-content
            let contentEl = doc.querySelector('.chapter-content');
            if (contentEl) {
                contentEl.querySelectorAll('script, ins, iframe, .ads, .quangcao').forEach(e => e.remove());
                const text = contentEl.innerText?.trim() || contentEl.textContent?.trim();
                if (text && text.length > 100) return cleanText(text);
            }

            // Fallback selectors
            const fallbacks = ['#chapter-content', '.chapter-c', '#content', '.reading-content', '.vung-doc'];
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
            console.warn('[TTC DL] Lỗi fetch chương:', e);
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
    // Only run on story detail pages (not chapter reading pages)
    const path = window.location.pathname;
    if (path.match(/\/truyen\/\d+/) && !path.includes('/doc-truyen/')) {
        if (document.readyState === 'complete') {
            setTimeout(createUI, 1500);
        } else {
            window.addEventListener('load', () => setTimeout(createUI, 1500));
        }
    }

})();
