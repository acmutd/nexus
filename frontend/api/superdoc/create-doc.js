import axios from 'axios'

const getUrl = (endpoint) => {
    const base = process.env.SUPERDOC_LAMBDA_URL || 'http://localhost:8000';
    return `${base}/${endpoint}`;
};


export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

    try {
        const { courseId, documentName } = req.body;
        const response = await axios.post(getUrl('documents/create'), {
            courseId: courseId,
            documentName: documentName
        });
        res.status(response.status).json(response.data);
    } catch (err) {
        const status = err.response?.status || 500;
        const data = err.response?.data || { error: err.message };
        res.status(status).json(data);
    }
}