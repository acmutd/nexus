const fetch = require('node-fetch');

const SCRAPER_URL = "https://l5ovs24hiqnag5kch37afukcnm0utczp.lambda-url.us-east-1.on.aws/scrape";
const netid = ""; // replace with test NetID
const password = "!"; // replace with test password

async function runQueries() {
  for (let i = 1; i <= 10; i++) {
    try {
      const res = await fetch(SCRAPER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ netid, password }),
      });
      const text = await res.text();
      console.log(`Query ${i}: Status ${res.status}\n${text}\n`);
    } catch (err) {
      console.error(`Query ${i} failed:`, err);
    }
    if (i < 10) await new Promise(r => setTimeout(r, 5000));
  }
}

runQueries();