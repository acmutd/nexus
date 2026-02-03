const { Client, GatewayIntentBits, AttachmentBuilder, ChannelType } = require('discord.js');

// Initialize client outside for warm starts
const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
});

async function getOrCreateFilesChannel(server) {
    let channel = server.channels.cache.find(
        c => c.name === 'files' && c.type === ChannelType.GuildText
    );
    if (!channel) {
        channel = await server.channels.create({
            name: 'files',
            type: ChannelType.GuildText,
            permissionOverwrites: [{ id: server.roles.everyone.id, deny: ['ViewChannel'] }],
        });
    }
    return channel;
}

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

    try {
        const { pdfBase64, pdfName, courseId } = req.body;

        if (!pdfBase64) {
            return res.status(400).json({ error: "Missing pdfBase64 field" });
        }

        // 1. Convert Base64 back to Buffer
        const pdfBuffer = Buffer.from(pdfBase64, 'base64');

        // 2. Discord Login & Upload
        if (!client.isReady()) {
            await client.login(process.env.DISCORD_BOT_TOKEN);
        }

        const server = client.guilds.cache.find(s => s.name === "pdf-db");
        if (!server) throw new Error("Discord server 'pdf-db' not found.");

        const channel = await getOrCreateFilesChannel(server);
        const file = new AttachmentBuilder(pdfBuffer, { name: pdfName || 'document.pdf' });
        
        const message = await channel.send({ files: [file] });
        const discordUrl = message.attachments.first().url;

        // 3. Trigger Merge (Optional call to your other bot endpoint)
        const botUrl = process.env.DISCORD_BOT_URL 
            ? `${process.env.DISCORD_BOT_URL}/api/superdoc/merge` 
            : 'http://localhost:3000/api/superdoc/merge';

        let mergeResult = { status: "skipped" };
        try {
            const mergeResponse = await fetch(botUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    pdfAttachment: discordUrl,
                    courseId: courseId,
                    documentName: pdfName
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