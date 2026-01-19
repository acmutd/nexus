const path = require('path');
const fs = require('fs');

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({status: 'error', message: 'Method not allowed'});
    }

    try {
        const crypto = require('crypto');
        const rid = (req.headers['x-request-id'] && String(req.headers['x-request-id'])) || (crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex'));
        const startedAt = Date.now();

        const {netid, password} = req.body;

        const netidSafe =
            typeof netid === 'string' && netid.length
                ? `${netid.slice(0, 2)}***${netid.slice(-1)}`
                : String(netid || '');

        console.log('[scraper/query] start', {
            rid,
            netid: netidSafe,
            hasPassword: Boolean(password),
            passwordLen: typeof password === 'string' ? password.length : null,
            scraperUrlSet: Boolean(process.env.SCRAPER_URL),
        });

        if (!netid || !password) {
            return res.status(400).json({status: 'error', message: 'Missing netid or password'});
        }

        const scraperRes = await fetch(process.env.SCRAPER_URL, {
            method: 'POST',
            headers: {'Content-Type': 'application/json', 'x-request-id': rid},
            body: JSON.stringify({netid, password}),
        });

        const upstreamMs = Date.now() - startedAt;
        const contentType = scraperRes.headers && scraperRes.headers.get ? scraperRes.headers.get('content-type') : null;

        console.log('[scraper/query] upstream meta', {
            rid,
            ok: scraperRes.ok,
            status: scraperRes.status,
            statusText: scraperRes.statusText,
            contentType,
            upstreamMs,
        });

        const VERBOSE = process.env.SCRAPER_DEBUG === 'true' || false;

        if (!scraperRes.ok) {
            const text = await scraperRes.text();
            console.error("Scraper Error:", scraperRes);
            console.error('Scraper error:', scraperRes.status, text);

            let parsed = null;
            try { parsed = JSON.parse(text); } catch (e) {}

            const upstreamPayload = parsed || { raw: String(text || '').slice(0, 1000) };

            if (scraperRes.status === 401 || scraperRes.status === 403) {
                return res.status(502).json({
                    status: 'error',
                    message: 'Invalid Credentials',
                    rid,
                    upstreamStatus: scraperRes.status,
                    upstreamStatusText: scraperRes.statusText,
                    upstream: VERBOSE ? upstreamPayload : undefined,
                });
            }

            return res.status(502).json({
                status: 'error',
                message: 'Scraper failed',
                rid,
                upstreamStatus: scraperRes.status,
                upstreamStatusText: scraperRes.statusText,
                upstream: VERBOSE ? upstreamPayload : undefined,
            });
        }

        console.log("ScraperRes", scraperRes);
        const data = await scraperRes.json();
        console.log("Data:", data);

        const dataDir = path.join(__dirname, '..', 'data');

        const findCourseRow = (dept, num, classNumber = null) => {
            try {
                if (!fs.existsSync(dataDir)) return null;
                const files = fs.readdirSync(dataDir).filter((f) => /^classes_(.+)\.json$/i.test(f));
                for (const f of files) {
                    const rows = JSON.parse(fs.readFileSync(path.join(dataDir, f), 'utf8'));
                    for (const row of rows) {
                        const rp = String(row.course_prefix || '').trim().toLowerCase();
                        const rn = String(row.course_number || '').trim();
                        const rClass = String(row.class_number || '').trim();
                        if (rp === String(dept || '').toLowerCase() && rn === String(num || '').trim()) {
                            if (classNumber && rClass && rClass === String(classNumber)) return row;
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

        console.log('[scraper/query] success', {
            rid,
            coursesIn: Array.isArray(data) ? data.length : 0,
            coursesOut: enriched.length,
            totalMs: Date.now() - startedAt,
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
