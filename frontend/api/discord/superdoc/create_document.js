const axios = require('axios')

const getBotUrl = (endpoint) => {
    const base = process.env.DISCORD_BOT_URL || 'http://localhost:3001';
    return `${base}/api/superdoc/${endpoint}`;
};

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

    try {
        const { course_id, document_name } = req.body;
        const response = await axios.post(getBotUrl('documents/create'), {
            courseId: course_id,
            documentName: document_name
        });
        res.status(response.status).json(response.data);
    } catch (err) {
        res.status(err.response?.status || 500).json(err.response?.data || { error: err.message });
    }
}
