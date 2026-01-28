const { DISCORD_CLIENT_ID, DISCORD_REDIRECT_URI } = process.env;

module.exports = async (req, res) => {
  // Used by frontend to probe availability
  if (req.method === 'HEAD') {
    console.log('[join-all] HEAD probe ok');
    return res.status(204).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).send('Method not allowed');
  }

  const { state } = req.query;
  if (!state) {
    return res.status(400).send('Missing state');
  }

  // Pass state through unchanged (already encoded on the frontend)
  console.log('[join-all] redirecting with state length', String(state).length);
  const params = new URLSearchParams({
    client_id: DISCORD_CLIENT_ID,
    redirect_uri: DISCORD_REDIRECT_URI,
    response_type: 'code',
    scope: 'identify guilds.join',
    state,
    prompt: 'consent',
  });

  const url = `https://discord.com/oauth2/authorize?${params.toString()}`;
  return res.redirect(url);
};
