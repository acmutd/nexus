require('dotenv/config');
const { Client, Events, GatewayIntentBits, Collection } = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

client.commands = new Collection();

// Bot login
console.log('Attempting bot login...');
client.login(process.env.DISCORD_TOKEN)
  .then(() => {
    console.log(`✅ Bot logged in successfully as ${client.user.tag}`);
  })
  .catch(err => {
    console.error('❌ Bot login failed:', err);
  });

// Ready event
client.once(Events.ClientReady, () => {
  console.log(`🤖 Ready event fired: ${client.user.tag}`);
});

// (Optional) You can add more bot event handlers here if needed

module.exports = client;
