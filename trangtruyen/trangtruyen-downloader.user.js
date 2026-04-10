// ==UserScript==
// @name         TrangTruyen Downloader
// @namespace    https://trangtruyen.site/
// @version      2.0
// @description  Tải toàn bộ nội dung truyện từ trangtruyen.site dưới dạng TXT
// @author       sonzin
// @match        https://trangtruyen.site/truyen/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    // ==================== CONFIG ====================
    const DELAY_MS = 800;       // Delay giữa các chương (ms)
    const MAX_RETRIES = 3;      // Số lần thử lại khi lỗi
    const BATCH_SIZE = 10;      // Batch download (mỗi batch 10 chương)
    const BATCH_DELAY = 2000;   // Delay giữa các batch
    const POPUP_WAIT_MS = 300;  // Polling interval khi đợi content render (ms)
    const POPUP_TIMEOUT = 15000; // Timeout cho mỗi popup load (ms)

    // ==================== UI ====================
    function createUI() {
        const titleEl = document.querySelector('h1');
        if (!titleEl) {
            setTimeout(createUI, 1500);
            return;
        }
        if (document.getElementById('tt-dl-btn')) return;

        // Find action area (buttons row)
        const actionArea = document.querySelector('div[class*="detailActions"]')
            || document.querySelector('div[class*="storyInfoMain"]')
            || titleEl.parentElement;

        if (!actionArea) {
            setTimeout(createUI, 2000);
            return;
        }

        // Download button
        const btn = document.createElement('button');
        btn.id = 'tt-dl-btn';
        btn.innerHTML = '📥 Tải TXT';
        btn.style.cssText = `
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white; border: none; padding: 10px 20px; border-radius: 8px;
            font-size: 14px; font-weight: 600; cursor: pointer;
            margin: 8px 4px; transition: all 0.3s ease;
            box-shadow: 0 2px 8px rgba(102, 126, 234, 0.4);
        `;
        btn.onmouseenter = () => btn.style.transform = 'translateY(-1px)';
        btn.onmouseleave = () => btn.style.transform = '';
        actionArea.appendChild(btn);

        // Progress panel
        const progress = document.createElement('div');
        progress.id = 'tt-progress';
        progress.style.cssText = `
            display:none; background:rgba(0,0,0,0.92); color:white;
            padding:16px 20px; border-radius:12px; margin-top:12px;
            font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
            width:100%; box-sizing:border-box; backdrop-filter:blur(10px);
            border:1px solid rgba(255,255,255,0.1);
        `;
        progress.innerHTML = `
            <div id="tt-title" style="font-weight:700;margin-bottom:8px;font-size:14px">Đang tải...</div>
            <div style="background:rgba(255,255,255,0.12);border-radius:8px;height:6px;overflow:hidden;margin-bottom:8px">
                <div id="tt-bar" style="background:linear-gradient(90deg,#667eea,#764ba2);height:100%;width:0%;border-radius:8px;transition:width 0.3s ease"></div>
            </div>
            <div id="tt-text" style="font-size:13px;color:rgba(255,255,255,0.8)"></div>
            <div id="tt-log" style="font-size:11px;color:rgba(255,255,255,0.5);margin-top:4px;max-height:60px;overflow:hidden"></div>
        `;
        actionArea.parentElement.insertBefore(progress, actionArea.nextSibling);

        btn.addEventListener('click', startDownload);
        console.log('[TT DL] ✅ Sẵn sàng!');
    }

    function showProgress(current, total, text, log) {
        const p = document.getElementById('tt-progress');
        if (!p) return;
        p.style.display = 'block';
        const pct = total > 0 ? Math.round((current / total) * 100) : 0;
        document.getElementById('tt-bar').style.width = pct + '%';
        if (text) document.getElementById('tt-text').textContent = text;
        else document.getElementById('tt-text').textContent = `${current}/${total} chương (${pct}%)`;
        if (log) document.getElementById('tt-log').textContent = log;
    }

    // ==================== CHAPTER LIST EXTRACTION ====================
    function extractChaptersFromPage() {
        const chapters = [];

        // Method 1: Parse RSC data trong <script> tags
        const scripts = document.querySelectorAll('script');
        for (const script of scripts) {
            const text = script.textContent;
            if (!text.includes('self.__next_f.push')) continue;

            const pattern = /\{"id":"([^"]+)","title":"([^"]+)","order":(\d+)\}/g;
            let match;
            while ((match = pattern.exec(text)) !== null) {
                chapters.push({ id: match[1], title: match[2], order: parseInt(match[3]) });
            }
        }

        // Method 2: Fallback - scrape từ DOM modal
        if (chapters.length === 0) {
            const items = document.querySelectorAll('a[class*="chapterItem"], a[href*="/truyen/"][class*="chapter"]');
            items.forEach(el => {
                const href = el.getAttribute('href');
                if (!href) return;
                const id = href.split('/').pop();
                const title = el.textContent.trim();
                if (id && title) {
                    chapters.push({ id, title, order: chapters.length + 1 });
                }
            });
        }

        // Method 3: Fallback - parse từ chapters array pattern
        if (chapters.length === 0) {
            const allText = Array.from(scripts).map(s => s.textContent).join('');
            const arrayMatch = allText.match(/\[(\{"id":"cm[^"]+","title":"[^"]+","order":\d+\}(?:,\{"id":"cm[^"]+","title":"[^"]+","order":\d+\})*)\]/);
            if (arrayMatch) {
                try {
                    const arr = JSON.parse('[' + arrayMatch[1] + ']');
                    chapters.push(...arr);
                } catch (e) { /* ignore */ }
            }
        }

        // Deduplicate & sort
        const seen = new Set();
        const unique = chapters.filter(ch => {
            if (seen.has(ch.id)) return false;
            seen.add(ch.id);
            return true;
        });
        unique.sort((a, b) => a.order - b.order);

        return unique;
    }

    function getStorySlug() {
        return window.location.pathname.split('/').filter(Boolean)[1] || '';
    }

    function getStoryTitle() {
        const h1 = document.querySelector('h1');
        if (!h1) return 'truyen';
        return cleanContent(h1.innerText || h1.textContent || 'truyen');
    }

    function getStoryAuthor() {
        const el = document.querySelector('span[class*="authorName"]')
            || document.querySelector('p[class*="authorInfo"] span');
        if (!el) return '';
        return cleanContent(el.innerText || el.textContent || '');
    }

    // ==================== CONTENT EXTRACTION ====================
    // Dùng window.open() popup vì site dùng Next.js streaming SSR:
    // - fetch() chỉ trả về skeleton HTML + "Đang tải nội dung..."
    // - Nội dung thực sự chỉ xuất hiện sau khi JS client-side hydrate
    // - Cần load trang trong browser context rồi đọc rendered DOM

    /**
     * Load một chương trong popup window ẩn, đợi content render,
     * rồi extract text từ DOM.
     */
    async function fetchChapterContent(chapterId) {
        const slug = getStorySlug();
        const url = `https://trangtruyen.site/truyen/${slug}/${chapterId}`;

        return new Promise((resolve) => {
            let resolved = false;

            // Mở popup nhỏ (offscreen)
            const popup = window.open(url, '_tt_dl_popup',
                'width=800,height=600,left=-9999,top=-9999,menubar=no,toolbar=no,status=no');

            if (!popup) {
                console.warn('[TT DL] Popup bị chặn! Cho phép popup cho site này.');
                resolve(null);
                return;
            }

            const timeout = setTimeout(() => {
                if (!resolved) {
                    resolved = true;
                    try { popup.close(); } catch (e) { }
                    resolve(null);
                }
            }, POPUP_TIMEOUT);

            // Polling để đợi content render
            const check = () => {
                if (resolved) return;
                try {
                    const doc = popup.document;
                    if (!doc || !doc.body) {
                        setTimeout(check, POPUP_WAIT_MS);
                        return;
                    }

                    // Tìm content container
                    const contentEl = doc.querySelector('div[class*="textContent"]');
                    if (!contentEl) {
                        setTimeout(check, POPUP_WAIT_MS);
                        return;
                    }

                    // Đợi cho content thực sự có text (không phải "Đang tải")
                    const rawText = contentEl.textContent || '';
                    const cleanText = rawText.replace(/[\u200B-\u200D\uFEFF\u200E\u200F\u2060-\u2064\u2066-\u2069\u00AD]/g, '').trim();

                    if (cleanText.length < 50 || cleanText.includes('Đang tải nội dung')) {
                        setTimeout(check, POPUP_WAIT_MS);
                        return;
                    }

                    // Content đã render! Extract text
                    resolved = true;
                    clearTimeout(timeout);

                    // Lấy text từ <p> tags hoặc nội dung div
                    const paragraphs = contentEl.querySelectorAll('p');
                    let content;

                    if (paragraphs.length > 1) {
                        content = Array.from(paragraphs)
                            .map(p => p.textContent.trim())
                            .filter(t => t.length > 0)
                            .join('\n\n');
                    } else {
                        // Content nằm trong div text nodes trực tiếp
                        content = contentEl.innerText || contentEl.textContent;
                    }

                    popup.close();
                    resolve(cleanContent(content));
                } catch (e) {
                    // Cross-origin errors hoặc popup đã đóng
                    if (e.name === 'SecurityError' || e.message?.includes('cross-origin')) {
                        // Không thể access popup do CORS - thử cách khác
                        resolved = true;
                        clearTimeout(timeout);
                        try { popup.close(); } catch (_) { }
                        resolve(null);
                    } else {
                        setTimeout(check, POPUP_WAIT_MS);
                    }
                }
            };

            // Bắt đầu polling sau 1.5s (cho trang load)
            setTimeout(check, 1500);
        });
    }

    function cleanContent(text) {
        if (!text) return '';
        return text
            // Xóa zero-width characters (watermark ẩn)
            .replace(/[\u200B-\u200D\uFEFF\u200E\u200F\u2060-\u2064\u2066-\u2069\u00AD]/g, '')
            // Normalize whitespace
            .replace(/\t/g, ' ')
            .replace(/ {2,}/g, ' ')
            // Clean excessive newlines
            .replace(/\n{3,}/g, '\n\n')
            // Unescape HTML entities
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/&#x27;/g, "'")
            .trim();
    }

    // ==================== MAIN DOWNLOAD ====================

    async function startDownload() {
        const btn = document.getElementById('tt-dl-btn');
        btn.disabled = true;
        btn.textContent = '⏳ Đang xử lý...';
        btn.style.opacity = '0.7';

        try {
            const title = getStoryTitle();
            const author = getStoryAuthor();

            showProgress(0, 0, 'Bước 1: Lấy danh sách chương...');

            // Step 1: Extract chapters
            const chapters = extractChaptersFromPage();
            if (!chapters.length) {
                alert('Không tìm thấy chương nào!\n\nThử nhấn "Mục lục" trước rồi bấm tải lại.');
                resetButton(btn);
                return;
            }

            console.log(`[TT DL] Tìm thấy ${chapters.length} chương`);
            showProgress(0, chapters.length, `Tìm thấy ${chapters.length} chương. Bắt đầu tải...`);

            // Step 2: Fetch content (tuần tự, 1 popup tại 1 thời điểm)
            document.getElementById('tt-title').textContent =
                `Bước 2: Tải nội dung ${chapters.length} chương...`;

            let fullText = title + '\n';
            if (author) fullText += `Tác giả: ${author}\n`;
            fullText += '='.repeat(Math.min(title.length * 2, 60)) + '\n\n';

            let okCount = 0, failCount = 0;
            const results = new Array(chapters.length).fill(null);

            for (let i = 0; i < chapters.length; i++) {
                const ch = chapters[i];
                const cleanTitle = cleanContent(ch.title);
                showProgress(i + 1, chapters.length, null, cleanTitle);

                let content = null;
                for (let retry = 0; retry < MAX_RETRIES; retry++) {
                    try {
                        content = await fetchChapterContent(ch.id);
                        if (content && content.length > 50) break;
                        content = null;
                    } catch (e) {
                        console.warn(`[TT DL] Lỗi chương ${cleanTitle} (lần ${retry + 1}):`, e.message);
                        content = null;
                    }
                    if (retry < MAX_RETRIES - 1) {
                        await sleep(1000 * (retry + 1));
                    }
                }

                results[i] = content;
                if (content) okCount++;
                else failCount++;

                // Rate limiting
                if (i < chapters.length - 1) {
                    await sleep(DELAY_MS);
                    if ((i + 1) % BATCH_SIZE === 0) {
                        showProgress(i + 1, chapters.length,
                            `Đã tải ${i + 1}/${chapters.length} (nghỉ giữa batch)...`);
                        await sleep(BATCH_DELAY);
                    }
                }

                if ((i + 1) % 50 === 0) {
                    console.log(`[TT DL] ${i + 1}/${chapters.length} (${okCount} OK, ${failCount} lỗi)`);
                }
            }

            // Step 3: Assemble text
            showProgress(chapters.length, chapters.length, 'Đang tạo file...');
            for (let i = 0; i < chapters.length; i++) {
                const ch = chapters[i];
                const cleanTitle = cleanContent(ch.title);
                fullText += cleanTitle + '\n' + '-'.repeat(cleanTitle.length) + '\n\n';
                if (results[i]) {
                    fullText += results[i] + '\n\n\n';
                } else {
                    fullText += '[Không tải được nội dung chương này]\n\n\n';
                }
            }

            // Step 4: Download
            downloadFile(fullText, sanitize(title) + '.txt');
            showProgress(chapters.length, chapters.length,
                `✅ Hoàn tất! ${okCount} thành công, ${failCount} thất bại.`);
            document.getElementById('tt-title').textContent = '✅ Tải xuống hoàn tất!';

        } catch (err) {
            alert('Lỗi: ' + err.message);
            console.error('[TT DL]', err);
        }

        resetButton(btn);
    }

    function resetButton(btn) {
        btn.disabled = false;
        btn.textContent = '📥 Tải TXT';
        btn.style.opacity = '1';
    }

    // ==================== UTILS ====================

    function sanitize(name) {
        return name.replace(/[\\/:*?"<>|]/g, '-').replace(/\s+/g, ' ').trim();
    }

    function downloadFile(text, filename) {
        const blob = new Blob(['\uFEFF' + text], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    function sleep(ms) {
        return new Promise(r => setTimeout(r, ms));
    }

    // ==================== INIT ====================
    const path = window.location.pathname;
    const parts = path.split('/').filter(Boolean);

    if (parts.length === 2 && parts[0] === 'truyen') {
        const waitForRender = () => {
            if (document.querySelector('h1')) {
                setTimeout(createUI, 1000);
            } else {
                setTimeout(waitForRender, 500);
            }
        };

        if (document.readyState === 'complete') {
            waitForRender();
        } else {
            window.addEventListener('load', waitForRender);
        }
    }

})();
