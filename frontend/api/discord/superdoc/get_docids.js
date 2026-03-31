import axios from 'axios'



const getBotUrl = (endpoint) => {
    const base = process.env.DISCORD_BOT_URL || 'http://localhost:3001';
    return `${base}/${endpoint}`;
};

export default async function handler(req, res) {
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