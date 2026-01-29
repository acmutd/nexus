
module.exports = async (req, res) => {
    if (req.method !== 'GET') {
        return res.status(405).json({error: 'Method not allowed'});
    }

    try {
       
        const codeRaw = req.query.code;
        const code = Array.isArray(codeRaw) ? codeRaw[0] : codeRaw;

        if (!code) {
            return res.status(400).json({error: 'Missing invite code'});
        }
        
        const url = `https://discord.com/api/v10/invites/${encodeURIComponent(code)}?with_counts=true&with_expiration=true`;

        const r = await fetch(url, {method: 'GET'});

        if (!r.ok) {
            const text = await r.text();
            return res.status(r.status).json({
                error: 'Discord API error',
                status: r.status,
                details: text
            });
        }

        const data = await r.json();
        res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=60');
        return res.status(200).json(data);
    } catch (err) {
        console.error('discord/invite error:', err);
        return res.status(500).json({error: 'Internal server error'});
    }
};