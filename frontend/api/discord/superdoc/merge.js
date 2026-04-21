const { Client, GatewayIntentBits, AttachmentBuilder, ChannelType } = require('discord.js');

// Initialize client outside for warm starts
const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
});

async function getOrCreateFilesChannel(server) {
    return server.channels.fetch('1468393627830190144');
}


const getBotUrl = (endpoint) => {
    const base = process.env.DISCORD_BOT_URL || 'http://localhost:3001';
    return `${base}/api/superdoc/${endpoint}`;
};


module.exports = async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

    try {
        const { pdfBase64, docName, courseId } = req.body;

        if (!pdfBase64 || !docName || !courseId) {
            return res.status(400).json({ error: "Missing pdfBase64, docName, or courseId" });
        }

        //Convert Base64 back to Buffer
        const pdfBuffer = Buffer.from(pdfBase64, 'base64');

        //Discord Login & Upload for the pdf-uploader bot
        if (!client.isReady()) {
            await client.login(process.env.PDF_MANAGER_BOT_TOKEN);
        }
        //console.log(client.guilds.cache)
        const server = await client.guilds.fetch(process.env.PDF_MANAGER_GUILD_ID);
        if (!server) throw new Error("Discord server 'pdf-db' not found.");

        const channel = await getOrCreateFilesChannel(server);
        const file = new AttachmentBuilder(pdfBuffer, { name: 'document.pdf' });

        const message = await channel.send({ files: [file] });
        const discordUrl = message.attachments.first().url;

        //calling merge after we acquire new pdf_url
        let mergeResult = { status: "skipped" };
        try {
            const mergeResponse = await fetch(getBotUrl('merge'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    pdfAttachment: discordUrl,
                    courseId: courseId,
                    documentName: docName
                }),
            });
            mergeResult = await mergeResponse.json();
        } catch (e) {
            console.warn("Merge endpoint call failed, but upload succeeded.");
        }

        return res.status(200).json({
            success: true,
            discordUrl,
            mergeResult
        });

    } catch (error) {
        console.error("Handler Error:", error.message);
        return res.status(500).json({ error: "Internal Error", detail: error.message });
    }
}