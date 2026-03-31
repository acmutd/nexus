import axios from 'axios'


const getBotUrl = (endpoint) => {
    const base = process.env.DISCORD_BOT_URL || 'http://localhost:3001';
    return `${base}/${endpoint}`;
};

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

    try {
        const { course_id, document_name } = req.body;
        // Map snake_case from website-frontend to camelCase for Discord-bot
        const response = await axios.post(getBotUrl('documents/create'), {
            courseId: course_id,
            documentName: document_name
        });
        res.status(response.status).json(response.data);
    } catch (err) {
        const status = err.response?.status || 500;
        const data = err.response?.data || { error: err.message };
        res.status(status).json(data);
    }
}