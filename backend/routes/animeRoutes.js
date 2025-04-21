const express = require("express");
const axios = require("axios");
const router = express.Router(); // Create a new router instance

// Define the route for currently airing anime
router.get("/currently-airing", async (req, res) => {
  try {
    // Fetch data from Jikan API
    const response = await axios.get("https://api.jikan.moe/v4/schedules");
    const animeList = response.data.data;

    // Filter anime that are currently airing
    const currentlyAiringAnime = animeList.filter(anime => anime.status === 'Currently Airing' && anime.airing === true);

    // Send the response data as JSON
    res.json(currentlyAiringAnime);

  } catch (error) {
    console.error('Error fetching anime data:', error);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
