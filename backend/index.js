const express = require("express");
const app = express();
const firebaseConfigRoutes = require("./config/firebase-config");
const discordRoutes = require("./routes/discordRoutes");
const cors = require('cors');

app.use(cors());
app.use(express.json());
app.use(firebaseConfigRoutes);
app.use("/api/discord", discordRoutes);

app.listen(5001, () => {
  console.log("Server is running on http://localhost:5001");
});