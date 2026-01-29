const path = require('path');
const fs = require('fs');

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({status: 'error', message: 'Method not allowed'});
    }

    try {
        const {netid, password} = req.body;

        if (!netid || !password) {
            return res.status(400).json({status: 'error', message: 'Missing netid or password'});
        }

        const scraperRes = await fetch(process.env.SCRAPER_URL, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({netid, password}),
        });

        if (!scraperRes.ok) {
            const text = await scraperRes.text();
            console.error("Scraper Error:", scraperRes);
            console.error('Scraper error:', scraperRes.status, text);
            return res.status(502).json({status: 'error', message: 'Invalid Credentials'});
        }

        console.log("ScraperRes", scraperRes);
        const data = await scraperRes.json();
        console.log("Data:", data);

        const VERBOSE = process.env.SCRAPER_DEBUG === 'true' || false;

        const dataDir = path.join(__dirname, '..', 'data');

        // Use remote coursebook URL  (COURSEBOOK_URL_26S)
        let remoteCourseRows = [];
        try {
            const url = process.env.COURSEBOOK_URL_26S || null;
            if (!url) {
                if (VERBOSE) console.warn('COURSEBOOK_URL_26S not set; course names will be null');
            } else {
                try {
                    const r = await fetch(url);
                    if (r.ok) {
                        const json = await r.json();
                        if (Array.isArray(json)) remoteCourseRows = json;
                        else if (VERBOSE) console.error('COURSEBOOK_URL_26S returned non-array');
                    } else if (VERBOSE) console.error('Failed to fetch COURSEBOOK_URL_26S:', r.status);
                } catch (e) {
                    if (VERBOSE) console.error('Error fetching COURSEBOOK_URL_26S:', e);
                }
            }
        } catch (e) {
            if (VERBOSE) console.error('prepare remoteCourseRows error:', e);
        }

        const findCourseRow = (dept, num, classNumber = null) => {
            try {
                for (const row of remoteCourseRows) {
                    const rp = String(row.course_prefix || '').trim().toLowerCase();
                    const rn = String(row.course_number || '').trim();
                    const rClass = String(row.class_number || '').trim();
                    if (rp === String(dept || '').toLowerCase() && rn === String(num || '').trim()) {
                        if (classNumber && rClass && rClass === String(classNumber)) return row;
                        return row;
                    }
                }
            } catch (e) {
                if (VERBOSE) console.error('findCourseRow error:', e);
            }
            return null;
        };

        const enriched = (Array.isArray(data) ? data : []).map((entry) => {
            let course_id = null;
            if (typeof entry === 'string') course_id = entry;
            else if (entry && typeof entry === 'object' && entry.course_id) course_id = entry.course_id;
            else course_id = String(entry || '').toUpperCase();

            const m = String(course_id).match(/^([A-Z]{2,5})-?(\d{4})/);
            const dept = m ? m[1] : null;
            const num = m ? m[2] : null;

            let course_name = null;
            if (dept && num) {
                const r = findCourseRow(dept, num, null);
                if (r && r.title) course_name = String(r.title).trim();
            }

            const finalCourseName = course_name ? String(course_name).toUpperCase() : null;
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
        return res.status(500).json({status: 'error', message: 'Internal server error'});
    }
};
