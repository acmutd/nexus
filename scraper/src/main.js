const { chromium } = require('playwright');
const { BlackBoardScraper } = require('./pwScraper');
const express = require('express');
const app = express();
const port = 8080;

app.use(express.json());

// Scrape endpoint
app.post('/scrape', async (req, res) => {
  const { netid, password } = req.body;

  if (!netid || !password) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Missing NETID or PASSWORD in environment variables" })
    };
  }

  try {
    const scraper = new BlackBoardScraper(netid, password);
    const courses = await scraper.scrapeBlackboard();
    res.send(JSON.stringify(courses))

  } catch (error) {
    if (error.message.includes("Login failed")) {
      process.stdout.write(error.message);
      return res.status(500).json({
        error: error.message,
        details: error.message
      });
    }

    process.stdout.write("Scraping failed:", error);
    return res.status(500).json({
      error: "Scraping failed",
      details: error.message
    });
  }
});

// Health check endpoint
app.get('/', (req, res) => {
  res.send('Blackboard Scraper is running');
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
