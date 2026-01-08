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
      return res.status(502).json({ status: 'error', message: 'Invalid Credentials' });
    }
    console.log("ScraperRes",scraperRes)
    const data = await scraperRes.json();
    console.log("Data:", data);

    // Enrich courses with course_name, credits, and grade using local classes_*.json files
    const VERBOSE = process.env.SCRAPER_DEBUG === 'true' || false;
    const dataDir = require('path').join(__dirname, '..', 'data');

    const findCourseRow = (dept, num, classNumber = null) => {
      try {
        if (!require('fs').existsSync(dataDir)) return null;
        const files = require('fs').readdirSync(dataDir).filter((f) => /^classes_(.+)\.json$/i.test(f));
        for (const f of files) {
          const rows = JSON.parse(require('fs').readFileSync(require('path').join(dataDir, f), 'utf8'));
          for (const row of rows) {
            const rp = String(row.course_prefix || '').trim().toLowerCase();
            const rn = String(row.course_number || '').trim();
            const rClass = String(row.class_number || '').trim();
            if (rp === String(dept || '').toLowerCase() && rn === String(num || '').trim()) {
              // prefer exact class_number match when provided
              if (classNumber && rClass && rClass === String(classNumber)) return row;
              // otherwise return this row as reasonable match
              return row;
            }
          }
        }
      } catch (e) {
        if (VERBOSE) console.error('findCourseRow error:', e);
      }
      return null;
    };

    const enriched = (Array.isArray(data) ? data : []).map((entry) => {
      // entry may be string like 'CS-4348-Kim' or object { course_id: 'CS-4348-Kim' }
      let course_id = null;
      if (typeof entry === 'string') course_id = entry;
      else if (entry && typeof entry === 'object' && entry.course_id) course_id = entry.course_id;
      else course_id = String(entry || '').toUpperCase();

      // parse dept and number
      const m = String(course_id).match(/^([A-Z]{2,5})-?(\d{4})/);
      const dept = m ? m[1] : null;
      const num = m ? m[2] : null;

      // We do not rely on rawCourseId from scraper output. Lookup by dept+num (and optional class number if provided in future).
      let course_name = null;
      if (dept && num) {
        const r = findCourseRow(dept, num, null);
        if (r && r.title) course_name = String(r.title).trim();
      }

      // Format course_name as ALL CAPS
      const finalCourseName = course_name ? String(course_name).toUpperCase() : null;

      // Use the raw course_id returned by the scraper/lambda when available (preserve case)
      const finalCourseId = course_id;

      return {
        course_id: finalCourseId,
        course_name: finalCourseName,
        credits: 0,
        grade: 'In Progress',
      };
    });

    return res.json({
      status: 'success',
      courses: enriched,
    });
  } catch (err) {
    console.error('scraper/query error:', err);
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
});

module.exports = router;