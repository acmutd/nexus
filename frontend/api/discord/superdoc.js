const express = require('express');
const router = express.Router();
const multer = require('multer');
const { Client, GatewayIntentBits, AttachmentBuilder, ChannelType } = require('discord.js');


const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
});

async function getOrCreateFilesChannel(server) {
    const name = "files";
    let channel = server.channels.fetch('1468393627830190144')
    return channel;
}
const botUrl = process.env.DISCORD_BOT_URL
            ? `${process.env.DISCORD_BOT_URL}/api/superdoc/merge`
            : 'http://localhost:3000/api/superdoc/merge';


router.post('/pdfForwarding', upload.single('file'), async (req, res) => {
    console.log("File Name:", req.file.originalname);
    res.status(200).send("Backend post recieved");
})

//Node Backend routes to call Discord Bot endpoints



router.post('/merge_pdf', upload.single("file"), async (req, res) => {
    try {
        const { pdfBase64, docName, courseId } = req.body;

        if (!pdfBase64) {
            return res.status(400).json({ error: "Missing pdfBase64 field" });
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
            const mergeResponse = await fetch(botUrl, {
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

})


router.delete('/delete_heading', async (req, res) => {
    try {
        const old_heading = req.body.old_heading;
        const response = await axios.delete(botUrl, { data: { old_heading: old_heading } })


        res.status(response.status).json(response.data);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
})


router.post('/create_heading', async (req, res) => {
    try {
        const new_heading = req.body.new_heading;
        const response = await axios.post(botUrl, { new_heading: new_heading });


        res.status(response.status).json(response.data);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
})


router.put('/update_heading', async (req, res) => {
    try {
        const old_heading = req.body.old_heading;
        const new_heading = req.body.new_heading;
        const response = await axios.put(botUrl, { old_heading: old_heading, new_heading: new_heading });
        res.status(response.status).json(response.data);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
})


router.post('/get_docids', async (req, res) => {
    try {
        const course_id = req.body.course_id
        const response = await axios.post(botUrl, { course_id: course_id });
        res.status(response.status).json(response.data);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
})


router.post('/create_document', async (req, res) => {
    try {
        const { course_id, document_name } = req.body;
        if (!course_id || !document_name) {
            return res.status(400).json({ error: "Missing Fields" });
        }
        const payload =
        {
            course_id,
            document_name
        }


        const response = await axios.post(botUrl, payload);
        res.status(response.status).json(response.data);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
})
module.exports = router;

