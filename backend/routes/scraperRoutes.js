const express = require('express');
const router = express.Router();


router.post('/query', async (req, res) => {
  try {
    const { netid, password } = req.body;

    if (!netid || !password) {
      return res.status(400).json({ status: 'error', message: 'Missing netid or password' });
    }

    const scraperRes = await fetch(process.env.SCRAPER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ netid, password }),
    });

    if (!scraperRes.ok) {
      const text = await scraperRes.text();
      console.error("Scraper Error:",scraperRes);
      console.error('Scraper error:', scraperRes.status, text);
      return res.status(502).json({ status: 'error', message: 'Scraper failed' });
    }
    console.log("ScraperRes",scraperRes)
    const data = await scraperRes.json();
    console.log("Data:",data)
    return res.json({
      status: 'success',
      courses: data || [],
    });
  } catch (err) {
    console.error('scraper/query error:', err);
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
});

module.exports = router;
