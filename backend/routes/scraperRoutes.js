const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');

// Prevent repeated scrapes by returning cached results if a recent scrape exists.
// Requires a valid Firebase ID token in Authorization header: 'Bearer <token>'
router.post('/query', async (req, res) => {
  try {
    const { netid, password } = req.body;

    if (!netid || !password) {
      return res.status(400).json({ status: 'error', message: 'Missing netid or password' });
    }

    // Verify auth token to identify user and check last scrape time
    const authHeader = (req.headers.authorization || '').split(' ')[1];
    let uid = null;
    try {
      if (authHeader) {
        const decoded = await admin.auth().verifyIdToken(authHeader);
        uid = decoded.uid;
      }
    } catch (e) {
      console.warn('Failed to verify auth token for scraper request:', e?.message || e);
      // continue without uid; we'll still attempt scraping
      uid = null;
    }

    if (uid) {
      const userRef = admin.firestore().collection('users').doc(uid);
      const userSnap = await userRef.get();
      const userData = userSnap.exists ? userSnap.data() : {};
      const last = userData?.lastScrapeAt ? Date.parse(userData.lastScrapeAt) : 0;
      const now = Date.now();
      const RECENT_MS = 2 * 60 * 1000; // 2 minutes
      if (now - last < RECENT_MS) {
        console.log(`Returning cached courses for uid=${uid} (lastScrapeAt=${userData.lastScrapeAt})`);
        return res.json({ status: 'success', courses: userData.courses || [] });
      }
    }

    const scraperRes = await fetch(process.env.SCRAPER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ netid, password }),
    });

    if (!scraperRes.ok) {
      const text = await scraperRes.text();
      let parsed = null;
      try { parsed = JSON.parse(text); } catch (e) { parsed = null; }
      let errMsg = parsed?.error || parsed?.message || text;
      // If the upstream returned HTML or other non-JSON error page, don't forward the raw HTML — normalize it
      if (typeof errMsg === 'string' && /<\s*(!doctype|html|html>)/i.test(errMsg)) {
        errMsg = 'Scraper service error';
      }
      console.error('Scraper error:', scraperRes.status, errMsg);
      // Forward scraper status and message so the client can handle specific errors (e.g., invalid credentials)
      return res.status(scraperRes.status).json({ status: 'error', error: errMsg, details: parsed?.details || null });
    }

    const data = await scraperRes.json();

    // Persist courses and lastScrapeAt to Firestore if we have a uid
    if (uid) {
      try {
        const userRef = admin.firestore().collection('users').doc(uid);
        await userRef.set({ courses: data || [], lastScrapeAt: new Date().toISOString() }, { merge: true });
      } catch (e) {
        console.warn('Failed to write scraped courses to Firestore for uid=', uid, e?.message || e);
      }
    }

    return res.json({ status: 'success', courses: data || [] });
  } catch (err) {
    console.error('scraper/query error:', err);
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
});

module.exports = router;
