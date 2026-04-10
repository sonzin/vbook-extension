// ==UserScript==
// @name         nTruyen Downloader
// @namespace    https://ntruyen.biz/
// @version      2.0
// @description  Tải toàn bộ nội dung truyện từ ntruyen.biz
// @author       sonzin
// @match        https://ntruyen.biz/truyen/*
// @match        https://www.ntruyen.biz/truyen/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    const DELAY_MS = 1500;      // Delay between chapter fetches
    const PAGE_WAIT = 1500;     // Wait for pagination DOM update
    const IFRAME_WAIT = 4000;   // Wait for iframe JS to render content
    const MAX_RETRIES = 2;

    // ==================== UI ====================
    function createUI() {
        const allLinks = document.querySelectorAll('a, button');
        const readBtn = Array.from(allLinks).find(el => el.innerText.trim().includes('Đọc ngay'));
        if (!readBtn) {
            console.log('[nTruyen DL] Chưa thấy nút Đọc ngay, thử lại...');
            setTimeout(createUI, 2000);
            return;
        }

        const btn = document.createElement('button');
        btn.id = 'nt-download-btn';
        btn.innerHTML = '📥 Tải truyện';
        btn.className = readBtn.className;
        btn.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
        btn.style.color = 'white';
        btn.style.border = 'none';
        btn.style.cursor = 'pointer';
        btn.style.width = 'auto';
        btn.style.marginLeft = '8px';
        readBtn.style.width = 'auto';
        readBtn.parentElement.insertBefore(btn, readBtn.nextSibling);

        // Progress panel
        const progress = document.createElement('div');
        progress.id = 'nt-progress';
        progress.style.cssText = 'display:none; background:rgba(0,0,0,0.9); color:white; padding:16px 20px; border-radius:12px; margin-top:12px; font-family:sans-serif; width:100%;';
        progress.innerHTML = `
            <div id="nt-title" style="font-weight:700;margin-bottom:8px;font-size:14px">Đang tải...</div>
            <div style="background:rgba(255,255,255,0.15);border-radius:8px;height:8px;overflow:hidden;margin-bottom:8px">
                <div id="nt-bar" style="background:linear-gradient(90deg,#667eea,#764ba2);height:100%;width:0%;border-radius:8px;transition:width 0.3s"></div>
            </div>
            <div id="nt-text" style="font-size:13px;color:rgba(255,255,255,0.8)"></div>
            <div id="nt-log" style="font-size:11px;color:rgba(255,255,255,0.5);margin-top:4px;max-height:40px;overflow:hidden"></div>
        `;
        readBtn.closest('div').parentElement.appendChild(progress);

        btn.addEventListener('click', startDownload);
        console.log('[nTruyen DL] ✅ Sẵn sàng!');
    }

    function showProgress(current, total, text, log) {
        const p = document.getElementById('nt-progress');
        if (!p) return;
        p.style.display = 'block';
        const pct = total > 0 ? Math.round((current / total) * 100) : 0;
        document.getElementById('nt-bar').style.width = pct + '%';
        if (text) document.getElementById('nt-text').textContent = text;
        else document.getElementById('nt-text').textContent = `${current}/${total} (${pct}%)`;
        if (log) document.getElementById('nt-log').textContent = log;
    }

    // ==================== MAIN ====================

    async function startDownload() {
        const btn = document.getElementById('nt-download-btn');
        btn.disabled = true;
        btn.textContent = '⏳ Đang xử lý...';

        try {
            const title = document.querySelector('h1')?.innerText?.trim() || 'truyen';
            showProgress(0, 0, 'Bước 1: Lấy danh sách chương (click qua từng trang)...');

            // Step 1: Collect ALL chapters by clicking through pagination
            const chapters = await collectAllChapters();
            if (!chapters.length) {
                alert('Không tìm thấy chương nào!');
                btn.disabled = false;
                btn.textContent = '📥 Tải truyện';
                return;
            }

            console.log(`[nTruyen DL] Tìm thấy ${chapters.length} chương`);

            // Step 2: Check if content is accessible (test 1 chapter)
            showProgress(0, chapters.length, `Tìm thấy ${chapters.length} chương. Kiểm tra quyền truy cập...`);
            const testContent = await fetchViaIframe(chapters[0].url);
            if (!testContent || testContent.includes('nền tảng đọc truyện chữ online') || testContent.length < 200) {
                const proceed = confirm(
                    `⚠️ Nội dung chương bị khóa!\n\n` +
                    `Bạn cần mở 1 chương bất kỳ → click vào link Shopee/TikTok để mở khóa 10 tiếng.\n` +
                    `Sau khi mở khóa xong, quay lại trang này và bấm "Tải truyện" lần nữa.\n\n` +
                    `Bấm OK để thử tải anyway, Cancel để dừng.`
                );
                if (!proceed) {
                    btn.disabled = false;
                    btn.textContent = '📥 Tải truyện';
                    return;
                }
            }

            // Step 3: Fetch content for each chapter via iframe
            document.getElementById('nt-title').textContent = 'Bước 2: Tải nội dung chương...';
            let fullText = title + '\n' + '='.repeat(title.length) + '\n\n';
            let okCount = 0, failCount = 0;

            for (let i = 0; i < chapters.length; i++) {
                const ch = chapters[i];
                showProgress(i + 1, chapters.length, null, ch.name);

                let content = null;
                for (let r = 0; r < MAX_RETRIES; r++) {
                    content = await fetchViaIframe(ch.url);
                    if (content && content.length > 200 && !content.includes('nền tảng đọc truyện chữ online')) break;
                    content = null;
                    await sleep(1000);
                }

                fullText += ch.name + '\n' + '-'.repeat(ch.name.length) + '\n\n';
                if (content) {
                    fullText += content + '\n\n\n';
                    okCount++;
                } else {
                    fullText += '[Không tải được nội dung - cần mở khóa Shopee]\n\n\n';
                    failCount++;
                }

                if (i < chapters.length - 1) await sleep(DELAY_MS);
            }

            // Step 4: Download
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

    // ==================== COLLECT CHAPTERS VIA DOM CLICK ====================

    async function collectAllChapters() {
        const all = [];
        const seen = new Set();

        // Scrape current page
        scrapeChapters(all, seen);
        console.log(`[nTruyen DL] Trang 1: ${all.length} chương`);

        // Find max page number from pagination buttons
        let maxPage = getMaxPage();
        console.log(`[nTruyen DL] Tổng số trang: ${maxPage}`);

        // Click through pages 2..maxPage
        for (let page = 2; page <= maxPage; page++) {
            showProgress(page, maxPage, `Lấy danh sách chương trang ${page}/${maxPage}...`);

            // Find and click the page button
            const clicked = clickPageButton(page);
            if (!clicked) {
                console.warn(`[nTruyen DL] Không tìm thấy nút trang ${page}`);
                // Try clicking "next" button instead
                clickNextButton();
            }

            // Wait for DOM to update
            await sleep(PAGE_WAIT);

            // Scrape new chapters
            const before = all.length;
            scrapeChapters(all, seen);
            console.log(`[nTruyen DL] Trang ${page}: +${all.length - before} chương (tổng: ${all.length})`);

            // Update maxPage in case pagination revealed more pages
            const newMax = getMaxPage();
            if (newMax > maxPage) maxPage = newMax;
        }

        // Sort by chapter number
        all.sort((a, b) => {
            const na = parseInt((a.url.match(/chuong-(\d+)/) || [0, 0])[1]) || 0;
            const nb = parseInt((b.url.match(/chuong-(\d+)/) || [0, 0])[1]) || 0;
            return na - nb;
        });

        return all;
    }

    function scrapeChapters(list, seen) {
        document.querySelectorAll('a[href*="/doc-truyen/"]').forEach(a => {
            const name = a.innerText.trim();
            if (!name.includes('Chương') && !name.includes('chương')) return;
            const url = a.getAttribute('href') || new URL(a.href).pathname;
            if (seen.has(url)) return;
            seen.add(url);
            list.push({ name, url });
        });
    }

    function getMaxPage() {
        let max = 1;
        // Look for numbered buttons/links in the chapter list area
        const chapterSection = document.querySelector('[class*="chapter"], [class*="list"]')
            || document.body;

        chapterSection.querySelectorAll('button, a').forEach(el => {
            const t = el.innerText.trim();
            // Numbered page buttons
            if (/^\d+$/.test(t)) {
                const n = parseInt(t);
                if (n > max && n < 10000) max = n;
            }
            // href with page=N
            const href = el.href || el.getAttribute('href') || '';
            const m = href.match(/page=(\d+)/);
            if (m) {
                const n = parseInt(m[1]);
                if (n > max) max = n;
            }
        });

        // Also try to calculate from total chapters
        const bodyText = document.body.innerText;
        const totalMatch = bodyText.match(/Số chương[:\s]*(\d+)/i) || bodyText.match(/(\d+)\s*chương/i);
        if (totalMatch) {
            const calc = Math.ceil(parseInt(totalMatch[1]) / 50);
            if (calc > max) max = calc;
        }

        return max;
    }

    function clickPageButton(pageNum) {
        const buttons = document.querySelectorAll('button, a');
        for (const btn of buttons) {
            const t = btn.innerText.trim();
            if (t === String(pageNum)) {
                // Make sure this is a pagination button (not chapter number)
                // Check if it's near other page numbers
                const parent = btn.parentElement;
                if (parent) {
                    const siblings = parent.querySelectorAll('button, a');
                    const numbers = Array.from(siblings).filter(s => /^\d+$/.test(s.innerText.trim()));
                    if (numbers.length >= 2) {
                        btn.click();
                        return true;
                    }
                }
                // Fallback: click anyway if it looks like a page button
                if (btn.tagName === 'BUTTON' || btn.className.includes('page')) {
                    btn.click();
                    return true;
                }
            }
        }
        return false;
    }

    function clickNextButton() {
        const buttons = document.querySelectorAll('button, a');
        for (const btn of buttons) {
            const t = btn.innerText.trim();
            const label = btn.getAttribute('aria-label') || '';
            if (t === '>' || t === '»' || t === '→' || t.includes('Tiếp') ||
                label.includes('next') || label.includes('Next')) {
                btn.click();
                return true;
            }
        }
        return false;
    }

    // ==================== FETCH CONTENT VIA IFRAME ====================

    function fetchViaIframe(chapterUrl) {
        return new Promise((resolve) => {
            const fullUrl = chapterUrl.startsWith('http') ? chapterUrl : 'https://ntruyen.biz' + chapterUrl;
            const iframe = document.createElement('iframe');
            iframe.style.cssText = 'position:fixed;left:-9999px;top:-9999px;width:1px;height:1px;opacity:0;pointer-events:none;';
            iframe.sandbox = 'allow-same-origin allow-scripts';

            const timeout = setTimeout(() => {
                try { iframe.remove(); } catch (e) { }
                resolve(null);
            }, IFRAME_WAIT + 5000);

            iframe.onload = () => {
                // Wait for JS to render content
                setTimeout(() => {
                    try {
                        const doc = iframe.contentDocument || iframe.contentWindow.document;

                        // Try multiple selectors
                        const selectors = [
                            '.break-words.leading-relaxed',
                            '.break-words',
                            '.leading-relaxed',
                            '.chapter-content',
                            '#chapter-content',
                            'article',
                            '.prose'
                        ];

                        let text = null;
                        for (const sel of selectors) {
                            const el = doc.querySelector(sel);
                            if (el) {
                                // Remove junk
                                el.querySelectorAll('script, ins, iframe, [class*="adsbygo"]').forEach(e => e.remove());
                                el.querySelectorAll('a[href*="shopee"], a[href*="tiktok"], a[href*="lazada"]').forEach(e => e.remove());

                                const t = el.innerText?.trim();
                                if (t && t.length > 100) {
                                    text = t;
                                    break;
                                }
                            }
                        }

                        // Fallback: longest text div
                        if (!text) {
                            const divs = Array.from(doc.querySelectorAll('div'))
                                .filter(d => d.children.length < 30 && d.innerText.length > 300)
                                .sort((a, b) => b.innerText.length - a.innerText.length);
                            if (divs[0]) text = divs[0].innerText.trim();
                        }

                        clearTimeout(timeout);
                        iframe.remove();
                        resolve(text ? cleanText(text) : null);
                    } catch (e) {
                        console.warn('[nTruyen DL] iframe error:', e);
                        clearTimeout(timeout);
                        iframe.remove();
                        resolve(null);
                    }
                }, IFRAME_WAIT);
            };

            iframe.onerror = () => {
                clearTimeout(timeout);
                iframe.remove();
                resolve(null);
            };

            iframe.src = fullUrl;
            document.body.appendChild(iframe);
        });
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
    if (document.readyState === 'complete') {
        setTimeout(createUI, 1500);
    } else {
        window.addEventListener('load', () => setTimeout(createUI, 1500));
    }

})();
