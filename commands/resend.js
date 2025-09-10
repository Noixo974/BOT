const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, PermissionFlagsBits } = require('discord.js');
const Logger = require('../utils/logger');
const { pool } = require('../db');
const config = require('../config/config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('resend')
        .setDescription('Renvoie le message embed avec les boutons dans un ticket')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

    async execute(interaction) {
        try {
            await interaction.deferReply({ ephemeral: true });
            
            const channel = interaction.channel;
            const channelName = channel.name.toLowerCase();

            // Vérifie si c'est un canal de ticket
            if (!channelName.startsWith('ticket-') && !channelName.startsWith('ticketc-')) {
                return await interaction.editReply({
                    content: 'Cette commande ne peut être utilisée que dans un canal de ticket !',
                    ephemeral: true
                });
            }

            // Détermine si c'est un ticket de candidature ou standard
            const isTicketC = channelName.startsWith('ticketc-'); 

            // Enregistre ou met à jour le ticket dans la base de données
            try {
                if (isTicketC) {
                    // Vérifie si le ticket de candidature existe déjà
                    const [existingTicketC] = await pool.execute(
                        'SELECT * FROM ticketsC WHERE channel_idC = ?',
                        [channel.id]
                    );

                    if (existingTicketC.length === 0) {
                        // Si le ticket de candidature n'existe pas dans la base de données, on l'ajoute
                        await pool.execute(
                            'INSERT INTO ticketsC (channel_idC, user_idC, guild_idC) VALUES (?, ?, ?)',
                            [channel.id, interaction.user.id, interaction.guild.id]
                        );
                        Logger.log(`TicketC ${channelName} ajouté à la base de données`, 'TicketsC');
                    }
                } else {
                    // Vérifie si le ticket standard existe déjà
                    const [existingTicket] = await pool.execute(
                        'SELECT * FROM tickets WHERE channel_id = ?',
                        [channel.id]
                    );

                    if (existingTicket.length === 0) {
                        // Si le ticket standard n'existe pas dans la base de données, on l'ajoute
                        await pool.execute(
                            'INSERT INTO tickets (user_id, channel_id, guild_id) VALUES (?, ?, ?)',
                            [interaction.user.id, channel.id, interaction.guild.id]
                        );
                        Logger.log(`Ticket ${channelName} ajouté à la base de données`, 'Tickets');
                    }
                }
            } catch (error) {
                Logger.error('Erreur lors de l\'enregistrement du ticket dans la base de données: ' + error, 'Tickets');
            }

            // Crée les boutons appropriés selon le type de ticket
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(isTicketC ? 'close_ticketC' : 'close_ticket')
                    .setLabel('Fermer le ticket ❌')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId(isTicketC ? 'take_ticketC' : 'take_ticket')
                    .setLabel('Prendre en charge 🛠️')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId(isTicketC ? 'unassign_ticketC' : 'unassign_ticket')
                    .setLabel('Ne plus prendre en charge 🚫')
                    .setStyle(ButtonStyle.Secondary)
            );

            // Crée l'embed approprié
            const embed = new EmbedBuilder()
                .setColor('#000000')
                .setFooter({ text: 'Secrétaire du O\'Sheas Barbers - Développé par Nathan Pablosco ❤️', iconURL: interaction.client.user.displayAvatarURL() });

            if (isTicketC) {
                embed.setDescription('Bonjour 👋,\n\n**__Merci de nous indiquer les choses suivantes :__**\n\n➥ Nom/Prénom :\n➥ Numéro de téléphone :\n➥ Motif de la demande :\n\n**Remplir ce formulaire :** https://docs.google.com/forms/d/e/1FAIpQLSe6-hcsqVgtjA41-6gCl1Y2j2rY6ad1sI3gO49hc2FNpea0QA/viewform?usp=dialog');
            } else {
                embed.setDescription('Bonjour 👋,\n\n**__Merci de nous indiquer les choses suivantes :__**\n\n➥ Nom/Prénom :\n➥ Numéro de téléphone :\n➥ Motif de la demande :');
            }

            // ID du rôle à mentionner
            const role = await interaction.guild.roles.fetch(config.discord.roles.admin);
            if (!role) {
                Logger.error(`Rôle administrateur non trouvé`, 'Resend');
            }

            await interaction.channel.send({
                content: role ? `${role}` : '',
                embeds: [embed],
                components: [row],
            });

            await interaction.editReply({
                content: 'Le message a été renvoyés avec succès !',
                ephemeral: true,
            });

            Logger.log(`Message de ticket renvoyé dans ${channel.name} par ${interaction.user.tag}`, isTicketC ? 'TicketsC' : 'Tickets');

        } catch (error) {
            console.error(error);
            if (interaction.deferred) {
                await interaction.editReply({
                    content: 'Une erreur est survenue lors du renvoi du message.',
                    ephemeral: true
                });
            } else {
                await interaction.reply({
                    content: 'Une erreur est survenue lors du renvoi du message.',
                    ephemeral: true
                });
            }
        }
    },
};
