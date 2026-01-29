const axios = require('axios');

// require('dotenv').config()

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({error: 'Method not allowed'});
    }

    try {
        console.log('Backend allocation request:', req.body);

        const {discordId, courses} = req.body;

        if (!discordId || !courses || !Array.isArray(courses)) {
            return res.status(400).json({error: 'Missing or invalid discordId or courses'});
        }

        // Forward to bot server
        const botUrl = process.env.DISCORD_BOT_URL
            ? `${process.env.DISCORD_BOT_URL}/api/discord/allocate`
            : 'http://localhost:3000/bot/allocate';

        const botResponse = await axios.post(botUrl, {
            discordId,
            courses,
        });

        return res.json(botResponse.data);
    } catch (err) {
        console.error('Backend allocation error:', err.response?.data || err.message);
        return res.status(500).json({
            error: 'Failed to allocate courses via bot',
            details: err.response?.data || err.message,
        });
    }
};
