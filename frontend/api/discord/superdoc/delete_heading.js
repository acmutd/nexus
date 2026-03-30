import axios from 'axios'



const getBotUrl = (endpoint) => {
    const base = process.env.DISCORD_BOT_URL || 'http://localhost:3001';
    return `${base}/api/superdoc/${endpoint}`;
};

export default async function handler(req, res) {
    if (req.method !== 'DELETE') return res.status(405).send('Method Not Allowed');

   try {
        const { courseId, documentName, old_heading } = req.body;
        const response = await axios.delete(getBotUrl('heading/delete'), {
            data: { courseId, documentName, oldHeading: old_heading }
        });
        res.status(response.status).json(response.data);
    } catch (err) {
        res.status(err.response?.status || 500).json(err.response?.data || { error: err.message });
    }
}