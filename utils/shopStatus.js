const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../config/config');
const Logger = require('./logger');
const path = require('path');

const imagePathOn = path.join(__dirname, '..', 'in', 'ouvert.png');
const imagePathOff = path.join(__dirname, '..', 'in', 'ferme.png');

/**
 * Envoie le message avec les boutons de contrôle du statut du salon
 * @param {Discord.TextChannel} channel - Le salon où envoyer le message
 */
async function sendControlPanel(channel) {
    const embed = new EmbedBuilder()
        .setColor(config.colors.primary || '#000000')
        .setTitle('Le O\'Sheas Barbers est ouvert ou fermé  ❓ ')
        .setDescription('\n\n**Appuyer sur le bouton :**\n\n**Ouvrir 🟢** : *Si vous voulez annoncer l\'ouverture du salon de coiffure.*\n**Fermer 🔴** : *Si vous voulez annoncer la fermeture du salon de coiffure.*')
        .setFooter({ text: config.bot.footer, iconURL: client.user.displayAvatarURL() });

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('on')
                .setLabel('Ouvrir 🟢')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('off')
                .setLabel('Fermer 🔴')
                .setStyle(ButtonStyle.Danger)
        );

    await channel.send({
        embeds: [embed],
        components: [row],
    });
}

/**
 * Initialise le panneau de contrôle du statut du salon
 * @param {Discord.Client} client - Le client Discord
 */
async function initializeShopStatus(client) {
    try {
        const channel = await client.channels.fetch(config.discord.channels.deliveryAnnouncements);
        if (channel) {
            // Nettoyer les anciens messages avec bulkDelete
            const messages = await channel.messages.fetch({ limit: 100 });
            const botMessages = messages.filter(msg => msg.author.id === client.user.id);
            if (botMessages.size > 0) {
                await channel.bulkDelete(botMessages);
            }
            
            await sendControlPanel(channel);
            Logger.log('\x1b[32mMessage de contrôle d\'ouverture/fermeture initialisé ✅\x1b[0m', 'ShopStatus');
        }
    } catch (error) {
        Logger.error(error, 'ShopStatus Initialization');
    }
}

/**
 * Gère les interactions avec les boutons de statut
 * @param {Discord.Interaction} interaction - L'interaction Discord
 */
async function handleStatusButton(interaction) {
    await interaction.deferUpdate();

    try {
        const destinationChannel = await client.channels.fetch(config.discord.channels.deliveryDestination);
        if (!destinationChannel) {
            throw new Error('Salon de destination introuvable');
        }

        // Nettoyer les anciens messages avec bulkDelete
        const messages = await destinationChannel.messages.fetch({ limit: 100 });
        const botMessages = messages.filter(msg => msg.author.id === client.user.id);
        if (botMessages.size > 0) {
            await destinationChannel.bulkDelete(botMessages);
        }

        const roleMention = `<@&${config.discord.roles.notification}>`;
        const imagePath = interaction.customId === 'on' ? imagePathOn : imagePathOff;
        const imageAttachment = { 
            attachment: imagePath, 
            name: interaction.customId === 'on' ? 'ouvert.png' : 'ferme.png' 
        };

        const embed = new EmbedBuilder()
            .setColor(config.colors.primary || '#000000')
            .setImage(`attachment://${imageAttachment.name}`)
            .setFooter({ text: config.bot.footer, iconURL: client.user.displayAvatarURL() });

        await destinationChannel.send({
            content: roleMention,
            allowedMentions: { parse: ['roles'] },
            embeds: [embed],
            files: [imageAttachment]
        });

        const status = interaction.customId === 'on' ? 'ouvert' : 'fermé';
        await interaction.followUp({
            content: `Le O\'Sheas Barber a été ${status} avec succès !`,
            ephemeral: true
        });
    } catch (error) {
        Logger.error(error, 'ShopStatus Button Handler');
        await interaction.followUp({
            content: 'Une erreur est survenue lors du changement de statut.',
            ephemeral: true
        });
    }
}

module.exports = {
    initializeShopStatus,
    handleStatusButton
};
