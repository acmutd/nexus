const express = require("express");
const app = express();
const firebaseConfigRoutes = require("./config/firebase-config");
const animeRoutes = require("./routes/animeRoutes"); // Import anime routes
const cors = require('cors');
// Middleware to handle routes from firebase-config
app.use(cors());
app.use(firebaseConfigRoutes);

// Middleware to handle anime routes
//app.use("/api/anime", animeRoutes); // This sets the path as /api/anime

app.listen(5001, () => {
  console.log("Server is running on http://localhost:5001");
});