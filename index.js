// index.js
const { Client, IntentsBitField } = require('discord.js');

// We will load the token from environment variables
const token = process.env.DISCORD_BOT_TOKEN;

if (!token) {
    console.error("No DISCORD_BOT_TOKEN found in environment variables.");
    process.exit(1);
}

// Create a new client instance
const client = new Client({
    intents: [
        IntentsBitField.Flags.Guilds,
        IntentsBitField.Flags.GuildMessages,
        IntentsBitField.Flags.MessageContent,
    ]
});

// When the client is ready, run this code once
client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}! Bot is online.`);
});

// A simple command: if someone types "!ping", bot replies with "Pong!"
client.on('messageCreate', (message) => {
    // Ignore bot messages or non-commands
    if (message.author.bot) return;

    if (message.content === '!ping') {
        message.reply('Pong!');
    }
});

client.login(token);