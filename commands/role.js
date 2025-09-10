const { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder, EmbedBuilder } = require('discord.js');
const { pool } = require('../db');
const Logger = require('../utils/logger');
const config = require('../config/config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('role_notifications')
        .setDescription("S'abonner aux notifications du salon O'Sheas Barbers"),

    async execute(interaction) {
        const channelId = interaction.channelId;

        try {
            // Vérifie si un message existe déjà pour ce salon
            const result = await pool.execute('SELECT * FROM bot_config WHERE channel_id = ? AND panel_type = ?', [channelId, 'role']);
const rows = result[0];

            const embed = new EmbedBuilder()
                .setColor('#000000')
                .setTitle("Sélectionnez un rôle afin d'être informé du statut du O'Sheas Barbers")
                .setDescription("Sélectionnez le rôle que vous souhaitez ajouter ou retirer pour recevoir des notifications lors des futures ouvertures et fermetures du O'Sheas Barbers")
                .setFooter({
                    text: 'Secrétaire du O\'Sheas Barbers - Développé par Nathan Pablosco ❤️',
                    iconURL: interaction.client.user.displayAvatarURL(),
                });

            const row = createRoleSelectMenu();

            if (result[0].length > 0) {
                // Met à jour le message existant
                const messageId = rows[0].message_idf;
                try {
                    const message = await interaction.channel.messages.fetch(messageId);
                    await message.edit({ embeds: [embed], components: [row] });
                    await interaction.reply({ content: 'Le panneau de rôles a été mis à jour !', ephemeral: true });
                } catch (error) {
                    Logger.error('Erreur lors de la mise à jour du message: ' + error, 'Roles');
                    // Si le message n'existe plus, on en crée un nouveau
                    await createNewRoleMessage(interaction, embed, row);
                }
            } else {
                // Crée un nouveau message
                await createNewRoleMessage(interaction, embed, row);
            }
        } catch (error) {
            Logger.error('Erreur dans la commande role_notifications: ' + error, 'Roles');
            await interaction.reply({
                content: 'Une erreur est survenue lors de la création du panneau de rôles.',
                ephemeral: true
            });
        }
    },
};

function createRoleSelectMenu() {
    return new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId('role_select')
            .setPlaceholder('Sélectionnez un rôle')
            .addOptions(
                {
                    label: 'Ping ouverture et fermeture ✅',
                    value: 'add_role',
                    description: `Recevez une notification pour l'ouverture et la fermeture du O'Sheas Barbers`,
                },
                {
                    label: 'Retirer ❌',
                    value: 'remove_role',
                    description: `Retirer le rôle de notification`,
                }
            )
    );
}

async function createNewRoleMessage(interaction, embed, row) {
    const message = await interaction.channel.send({ embeds: [embed], components: [row] });
    await pool.execute(
        'INSERT INTO bot_config (channel_id, message_idf, panel_type) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE message_idf = ?',
        [interaction.channelId, message.id, 'role', message.id]
    );
    await interaction.reply({ content: 'Le panneau de rôles a été créé !', ephemeral: true });
}

async function handleRoleInteraction(interaction) {
    const roleID = config.discord.roles.notification;

    try {
        const role = interaction.guild.roles.cache.get(roleID);
        const user = interaction.user;

        if (!role) {
            await interaction.reply({ content: 'Le rôle spécifié n\'existe pas.', ephemeral: true });
            return;
        }

        const member = await interaction.guild.members.fetch(user.id);
        const hasRole = member.roles.cache.has(roleID);

        if (interaction.values[0] === 'add_role' && !hasRole) {
            await member.roles.add(role);
            await interaction.reply({ content: `Le rôle ${role.name} vous a été attribué.`, ephemeral: true });
        } else if (interaction.values[0] === 'remove_role' && hasRole) {
            await member.roles.remove(role);
            await interaction.reply({ content: `Le rôle ${role.name} vous a été retiré.`, ephemeral: true });
        } else {
            await interaction.reply({
                content: interaction.values[0] === 'add_role'
                    ? 'Vous avez déjà ce rôle.'
                    : 'Vous n\'avez pas ce rôle.',
                ephemeral: true
            });
        }
    } catch (error) {
        Logger.error('Erreur dans handleRoleInteraction: ' + error, 'Roles');
        await interaction.reply({
            content: 'Une erreur est survenue lors de la gestion du rôle.',
            ephemeral: true
        });
    }
}

async function initializeRoleMessages(client) {
    try {
        // Récupérer tous les messages de rôle de la base de données
        const result = await pool.execute('SELECT * FROM bot_config WHERE panel_type = ?', ['role']);
const rows = result[0];
        
        for (const row of rows) {
            try {
                const channel = await client.channels.fetch(row.channel_id);
                if (!channel) {
                    Logger.error(`Canal ${row.channel_id} non trouvé`, 'Roles');
                    continue;
                }

                const message = await channel.messages.fetch(row.message_idf);
                if (!message) {
                    Logger.error(`Message ${row.message_idf} non trouvé dans le canal ${row.channel_id}`, 'Roles');
                    continue;
                }

                // Recréer l'embed
                const embed = new EmbedBuilder()
                    .setColor('#000000')
                    .setTitle("Sélectionnez un rôle afin d'être informé du statut du O'Sheas Barbers")
                    .setDescription("Sélectionnez le rôle que vous souhaitez ajouter ou retirer pour recevoir des notifications lors des futures ouvertures et fermetures du O'Sheas Barbers")
                    .setFooter({
                        text: 'Secrétaire du O\'Sheas Barbers - Développé par Nathan Pablosco ❤️',
                        iconURL: client.user.displayAvatarURL(),
                    });

                // Mettre à jour le message avec les composants frais
                await message.edit({ embeds: [embed], components: [createRoleSelectMenu()] });
                Logger.log(`\x1b[32mMessage de rôle initialisé avec succès dans le canal : ${channel.name} ✅\x1b[0m`, 'Roles');
            } catch (error) {
                Logger.error(`Erreur lors de la réinitialisation du message de rôle: ${error}`, 'Roles');
            }
        }
    } catch (error) {
        Logger.error(`Erreur lors de l'initialisation des messages de rôle: ${error}`, 'Roles');
    }
}

module.exports.handleRoleInteraction = handleRoleInteraction;
module.exports.initializeRoleMessages = initializeRoleMessages;
