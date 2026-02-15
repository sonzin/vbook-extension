let BASE_URL = "https://ngoctieucac.com";
try {
    if (CONFIG_URL) {
        BASE_URL = CONFIG_URL;
    }
} catch (error) {
}

// Cookie for VIP authentication - update this when it expires
let AUTH_COOKIE = "accessToken=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI2OTkxNDcwYzUzN2ZjN2M2NTE1MTllOGUiLCJlbWFpbCI6InF1YW5nc29uLmNlbnN0YWZAZ21haWwuY29tIiwiaXNBZG1pbiI6ZmFsc2UsInByZW1pdW1VbnRpbCI6IjIwMjYtMDItMjJUMDU6MTc6MzMuNjU4WiIsImV4cCI6MTc3MzcyNjQ5OH0.gcP1_KJX54nmtZqb_F-nDAAqXF7aRNsOeme-e3QFGe4; premiumUntil=2026-02-22T05%3A17%3A33.658Z";

function authFetch(url) {
    return fetch(url, {
        headers: {
            "Cookie": AUTH_COOKIE
        }
    });
}
