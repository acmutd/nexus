const axios = require('axios')



const getUrl = (endpoint) => {
    const base = process.env.SUPERDOC_LAMBDA_URL || 'http://localhost:8000';
    return `${base}/${endpoint}`;
};


module.exports = async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

    try {
        const response = await axios.get(getUrl(`documents/${req.body.courseId}`));
        res.status(response.status).json(response.data);
    }
    catch (err) {
        console.error(err);
        res.status(err.response?.status || 500).json(err.response?.data || { error: err.message });
    }
}