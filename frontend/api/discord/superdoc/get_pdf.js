const axios = require('axios');

const getBotUrl = (endpoint) => {
    const base = process.env.DISCORD_BOT_URL || 'http://localhost:3001';
    return `${base}/api/superdoc/${endpoint}`;
};

module.exports = async function handler(req, res) {
    if (req.method !== 'GET') return res.status(405).send('Method Not Allowed');

    try {
        const { courseId, documentName } = req.query;

        if (!courseId || !documentName) {
            return res.status(400).json({ error: 'Missing courseId or documentName' });
        }

        const response = await axios.get(getBotUrl(`documents/${courseId}/${documentName}/pdf`));

        return res.status(200).json(response.data);

    } catch (err) {
        console.error("get_pdf error:", err.message);
        return res.status(err.response?.status || 500).json(
            err.response?.data || { error: err.message }
        );
    }
}
