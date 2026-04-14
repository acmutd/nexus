const axios = require('axios')

const getBotUrl = (endpoint) => {
    const base = process.env.DISCORD_BOT_URL || 'http://localhost:3001';
    return `${base}/api/superdoc/${endpoint}`;
};

module.exports = async function handler(req, res) {

    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:5173'); // Your Frontend Port
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    
    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

    try {
        const response = await axios.get(getBotUrl(`documents/${req.body.courseId}`));
        res.status(response.status).json(response.data);
    }
    catch (err) {
        console.error(err);
        res.status(err.response?.status || 500).json(err.response?.data || { error: err.message });
    }
}
