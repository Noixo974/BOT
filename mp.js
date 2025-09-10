const { Client, GatewayIntentBits } = require('discord.js');
require('dotenv').config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}!`);
    try {
        const user = await client.users.fetch(process.env.USER_ID);
        if (user) {
            await user.send('NTM adam, sale merde');
            console.log(`Message sent to ${user.tag}`);
        } else {
            console.error('User not found.');
        }
    } catch (error) {
        console.error('Error sending message:', error);
    } finally {
        client.destroy();
    }
});

client.login(process.env.TOKEN);

