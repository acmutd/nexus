// require('dotenv').config()

const {DISCORD_CLIENT_ID} = process.env;

module.exports = (req, res) => {
    if (req.method !== 'GET') {
        return res.status(405).send('Method not allowed');
    }

    const {uid} = req.query;
    console.log(`Auth request for UID: ${uid}`);

    if (!uid) {
        return res.status(400).send('Missing UID parameter');
    }

    const params = new URLSearchParams({
        client_id: DISCORD_CLIENT_ID,
        // todo - add this jawn to vercel's env (url to callback route, like nexus.vercel.app/api/discord/callback, wtv it is)
        redirect_uri: process.env.DISCORD_REDIRECT_URI,
        response_type: 'code',
        scope: 'identify',
        state: uid,
    });

    const url = `https://discord.com/oauth2/authorize?${params.toString()}`;
    console.log(`Redirecting to: ${url}`);

    return res.redirect(url);
};
