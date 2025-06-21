const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const admin = require("firebase-admin");
require("dotenv").config();

const discordRoutes = require("./routes/discordRoutes");
const authRoutes = require("./routes/authRoutes");
const client = require("./config/bot");  // Your bot client

// Initialize Express app
const app = express();
app.use(cors());
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));

// ✅ Firebase Admin init
if (!admin.apps.length) {
  const serviceAccount = require("./service-account.json");
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: process.env.FIREBASE_PROJECT_ID
  });
  console.log("✅ Firebase Admin initialized");
}

// ✅ Firebase config route (for frontend)
app.get('/api/firebase-config', (req, res) => {
  res.json({
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID,
  });
});

// ✅ API routes
app.use("/api/discord", (req, res, next) => {
  req.client = client;  // Attach bot client to req
  next();
}, discordRoutes);

app.use("/api/auth", authRoutes);

// ✅ Main allocation endpoint (frontend POSTs here)
app.post("/api/discord/allocate", async (req, res) => {
  try {
    const { discordId, courses } = req.body;
    console.log("👉 /api/discord/allocate received:", req.body);

    if (!discordId || !courses || !Array.isArray(courses)) {
      return res.status(400).json({ error: "Missing or invalid discordId or courses" });
    }

    const userQuery = await admin.firestore().collection("users")
      .where("discordId", "==", discordId).get();

    if (userQuery.empty) {
      return res.status(404).json({ error: "User not found in Firestore" });
    }

    const userDoc = userQuery.docs[0].data();
    const servers = userDoc.servers || [];
    console.log(`✅ Found servers: ${servers}`);

    let allocated = 0;
    for (const serverId of servers) {
      const guild = client.guilds.cache.get(serverId);
      if (!guild) {
        console.log(`⚠️ Guild ${serverId} not found`);
        continue;
      }

      const member = await guild.members.fetch(discordId).catch(() => null);
      if (!member) {
        console.log(`⚠️ Member ${discordId} not found in ${guild.name}`);
        continue;
      }

      const { allocateCourseByServer } = require("./discord_utils/discordUtils.js");
      await allocateCourseByServer(courses, guild, member.user);
      console.log(`✅ Allocated courses in ${guild.name}`);
      allocated++;
    }

    if (allocated === 0) {
      return res.status(404).json({ error: "No servers processed successfully" });
    }

    res.json({ success: true, allocated });
  } catch (err) {
    console.error("❌ /api/discord/allocate error:", err);
    res.status(500).json({ error: "Failed to allocate courses", details: err.message || err });
  }
});

// ✅ Start server
const PORT = 5001;
app.listen(PORT, () => {
  console.log(`✅ Server is running on http://localhost:${PORT}`);
});