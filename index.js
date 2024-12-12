import 'dotenv/config';
import { Client, IntentsBitField } from 'discord.js';
import fetch from 'node-fetch';
import express from 'express';

const token = process.env.DISCORD_BOT_TOKEN;
const guildId = process.env.GUILD_ID;
const subscribedRoleId = process.env.SUBSCRIBED_ROLE_ID;
const secretToken = process.env.BOT_SECRET_TOKEN; // A secret token you set

if (!token || !guildId || !subscribedRoleId || !secretToken) {
    console.error('Missing environment variables');
    process.exit(1);
}

const client = new Client({
    intents: [
        IntentsBitField.Flags.Guilds,
        IntentsBitField.Flags.GuildMembers
    ]
});

client.once('ready', () => {
    console.log(`Bot logged in as ${client.user.tag}`);
});

// This function calls the website's API to get discordId & subscription status
async function checkSubscriptionStatus(userId) {
    const res = await fetch(`${process.env.WEBSITE_URL}/api/user-subscription-status?userId=${userId}`, {
        headers: {
            'Authorization': `Bearer ${process.env.API_SECRET_TOKEN}` // if required
        }
    });
    if (!res.ok) {
        throw new Error('Failed to fetch subscription status');
    }
    return await res.json(); // { discordId, isSubscribed }
}

async function updateUserRole(userId) {
    const { discordId, isSubscribed } = await checkSubscriptionStatus(userId);

    if (!discordId) {
        console.log('No discordId linked for this user');
        return;
    }

    const guild = client.guilds.cache.get(guildId);
    if (!guild) {
        console.error('Guild not found');
        return;
    }

    let member;
    try {
        member = await guild.members.fetch(discordId);
    } catch (e) {
        console.log('Member not found in guild');
        return;
    }

    if (isSubscribed) {
        if (!member.roles.cache.has(subscribedRoleId)) {
            await member.roles.add(subscribedRoleId);
            console.log(`Added subscribed role to ${member.user.tag}`);
        }
    } else {
        if (member.roles.cache.has(subscribedRoleId)) {
            await member.roles.remove(subscribedRoleId);
            console.log(`Removed subscribed role from ${member.user.tag}`);
        }
    }
}

async function removeUserRole(userId) {
    const { discordId } = await checkSubscriptionStatus(userId);
    const guild = client.guilds.cache.get(guildId);
    if (!guild) {
        console.error('Guild not found');
        return;
    }

    let member;
    try {
        member = await guild.members.fetch(discordId);
    } catch (e) {
        console.log('Member not found in guild');
        return;
    }

    if (member.roles.cache.has(subscribedRoleId)) {
        await member.roles.remove(subscribedRoleId);
        console.log(`Removed subscribed role from ${member.user.tag}`);
    }
}

// Simple Express server for receiving triggers from Next.js app
const app = express();
app.use(express.json());

// Protect this endpoint with a secret
app.post('/update-role', async (req, res) => {
    const { userId, secret } = req.body;
    if (secret !== secretToken) {
        return res.status(403).json({ error: 'Invalid secret token' });
    }
    if (!userId) {
        return res.status(400).json({ error: 'No userId provided' });
    }

    try {
        await updateUserRole(userId);
        res.json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Internal error updating role' });
    }
});

//route to remove role
app.post('/remove-role', async (req, res) => {
    const { userId, secret } = req.body;
    if (secret !== secretToken) {
        return res.status(403).json({ error: 'Invalid secret token' });
    }
    if (!userId) {
        return res.status(400).json({ error: 'No userId provided' });
    }

    try {
        await removeUserRole(userId);
        res.json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Internal error updating role' });
    }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Bot server running on port ${PORT}`));

client.login(token);