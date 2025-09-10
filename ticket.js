const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder,
    PermissionsBitField,
    EmbedBuilder,
} = require('discord.js');
const { pool } = require('./db');
const Logger = require('./utils/logger');
const config = require('./config/config');
const TicketArchiver = require('./utils/ticketArchiver');

module.exports = {
    async sendTicketPanel(client, channelId) {
        try {
            Logger.log('\x1b[32mDébut de l\'envoie du panneau de ticket dans le salon (ID) ✅ : \x1b[0m' + channelId, 'Tickets');
            
            const channel = await client.channels.fetch(channelId);
            if (!channel) {
                Logger.error('Canal non trouvé avec l\'ID: ' + channelId, 'Tickets');
                return;
            }
        
            // Vérifie si un message a été enregistré pour ce salon
            const [rows] = await pool.execute('SELECT * FROM bot_config WHERE channel_id = ?', [channelId]);
        
            if (rows.length > 0) {
                const messageId = rows[0].message_id;
                Logger.log('\x1b[32mMessage ID trouvé dans la base de données ✅ : \x1b[0m' + messageId, 'Tickets');
        
                try {
                    // Vérifie si le message existe toujours dans le salon
                    const message = await channel.messages.fetch(messageId);
                    if (message) {
                        Logger.log('\x1b[32mPanneau de ticket existant trouvé, pas besoin de le recréer ✅\x1b[0m', 'Tickets');
                        return;
                    }
                } catch (error) {
                    Logger.log('Message non trouvé dans Discord, création d\'un nouveau message', 'Tickets');
                    // On ne supprime pas l'entrée tout de suite, on la mettra à jour plus tard
                }
            }
        
            Logger.log('Création du nouveau message...', 'Tickets');
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('create_ticket')
                    .setLabel('🎫 Ouvrir un ticket')
                    .setStyle(ButtonStyle.Primary)
            );

            const embed = new EmbedBuilder()
                .setColor('#000000')
                .setTitle('📨・Nous contacter')
                .setFooter({ text: 'Secrétaire du O\'Sheas Barbers - Développé par Nathan Pablosco ❤️', iconURL: client.user.displayAvatarURL() })
                .setDescription('🤔・Qu\'est-ce-qu\'un ticket ?\nUn ticket est un espace que vous pouvez créer pour diverses raisons, mais il est important de le faire de manière réfléchie et sans en abuser.\n\n🎫・Comment puis-je créer un ticket ?\nPour ouvrir un ticket, il suffit de cliquer sur le bouton ci-dessous. Cela vous donnera un menu offrant plusieurs options pour votre demande.\n\n❓・Quelle est la raison de créer un ticket ?\nVous pouvez ouvrir un ticket pour les raisons suivantes :\n\n・☎️ Contacter le secrétariat pour une question/demande\n\n・🤝 Partenariat ou Commande\n\n・🎉 Événement ou Tombola');

            const message = await channel.send({ embeds: [embed], components: [row] });
            Logger.log('Nouveau message envoyé avec succès, ID: ' + message.id, 'Tickets');

            // Mise à jour ou insertion dans la base de données
            if (rows.length > 0) {
                await pool.query('UPDATE bot_config SET message_id = ? WHERE channel_id = ?', [message.id, channelId]);
                Logger.log('Message ID mis à jour dans la base de données', 'Tickets');
            } else {
                await pool.query('INSERT INTO bot_config (channel_id, message_id) VALUES (?, ?)', [channelId, message.id]);
                Logger.log('Nouveau message enregistré dans la base de données', 'Tickets');
            }
        } catch (error) {
            Logger.error('Erreur dans sendTicketPanel: ' + error, 'Tickets');
            throw error;
        }
    },

    async handleInteraction(interaction) {
        if (interaction.customId === 'create_ticket') {
            try {
                // Répond immédiatement
                await interaction.reply({ 
                    content: 'Chargement...',
                    ephemeral: true 
                });

                const row = new ActionRowBuilder().addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId('select_ticket_topic')
                        .setPlaceholder('Choisissez un sujet...')
                        .addOptions([
                            {
                                label: '☎️ Contacter le secrétariat',
                                description: 'Pour poser une question ou faire une demande au secrétariat.',
                                value: 'support_tech',
                            },
                            {
                                label: '🤝 Partenariat ou Commande',
                                description: 'Demande concernant un partenariat ou une commande.',
                                value: 'billing_issue',
                            },
                            {
                                label: '🎉 Événement ou Tombola',
                                description: 'Informations ou questions sur un événement ou une tombola.',
                                value: 'other',
                            },
                        ])
                );

                // Modifie le message initial au lieu d'envoyer un nouveau
                await interaction.editReply({
                    content: 'Veuillez choisir le sujet de votre ticket :',
                    components: [row],
                    ephemeral: true
                });
            } catch (error) {
                console.error('Erreur lors de la création du ticket:', error);
                try {
                    await interaction.editReply({
                        content: 'Une erreur est survenue lors de la création du ticket.',
                        ephemeral: true
                    });
                } catch (e) {
                    console.error('Erreur lors de la réponse d\'erreur:', e);
                }
            }
        } else if (interaction.customId === 'select_ticket_topic') {
            await interaction.deferReply({ ephemeral: true });

            const selectedOption = interaction.values[0];
            const user = interaction.user;
            const guild = interaction.guild;

            let categoryId;
            switch (selectedOption) {
                case 'support_tech':
                    categoryId = config.discord.categories.ticketSupport;
                    break;
                case 'billing_issue':
                    categoryId = config.discord.categories.ticketBilling;
                    break;
                case 'other':
                    categoryId = config.discord.categories.ticketOther;
                    break;
                default:
                    return interaction.followUp({ content: 'Option invalide.', ephemeral: true });
            }

            try {
                // Récupérer la catégorie
                const category = await guild.channels.fetch(categoryId);
                if (!category) {
                    return interaction.followUp({ content: 'Erreur: La catégorie spécifiée n\'existe pas.', ephemeral: true });
                }

                // Récupérer les permissions de la catégorie
                const categoryPermissions = category.permissionOverwrites.cache.map(perm => ({
                    id: perm.id,
                    type: perm.type,
                    allow: perm.allow,
                    deny: perm.deny
                }));

                // Ajouter les permissions spécifiques pour l'utilisateur qui crée le ticket
                const userPermission = {
                    id: user.id,
                    allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory],
                };

                // Créer le ticket avec les permissions héritées et les permissions spécifiques
                const ticketChannel = await guild.channels.create({
                    name: `ticket-${user.username}`,
                    type: 0,
                    parent: categoryId,
                    permissionOverwrites: [...categoryPermissions, userPermission],
                });

                await pool.query('INSERT INTO tickets (user_id, channel_id, guild_id) VALUES (?, ?, ?)', [
                    user.id,
                    ticketChannel.id,
                    guild.id,
                ]);

                Logger.log(`Nouveau ticket créé: ${ticketChannel.name} par ${user.tag} (${user.id})`, 'Tickets');

                // Envoie un message de confirmation sans embed
                await interaction.followUp({
                    content: `Votre ticket a bien été créé dans la catégorie appropriée : ${ticketChannel}.`,
                    ephemeral: true,
                });

                // Crée un bouton pour fermer et prendre en charge le ticket
                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('close_ticket')
                        .setLabel('Fermer le ticket ❌')
                        .setStyle(ButtonStyle.Danger),
                    new ButtonBuilder()
                        .setCustomId('take_ticket')
                        .setLabel('Prendre en charge 🛠️')
                        .setStyle(ButtonStyle.Success),
                    new ButtonBuilder()
                        .setCustomId('unassign_ticket')
                        .setLabel('Ne plus prendre en charge 🚫')
                        .setStyle(ButtonStyle.Secondary)
                );

                // Crée l'embed pour le ticket
                const embed = new EmbedBuilder()
                    .setColor('#000000') // Choisis la couleur que tu préfères
                    .setFooter({ text: 'Secrétaire du O\'Sheas Barbers - Développé par Nathan Pablosco ❤️', iconURL: interaction.client.user.displayAvatarURL() })
                    .setDescription('Bonjour 👋,\n\n**__Merci de nous indiquer les choses suivantes :__**\n\n➥ Nom/Prénom :\n➥ Numéro de téléphone :\n➥ Motif de la demande :');

                // ID du rôle à mentionner
                const role = await guild.roles.fetch(config.discord.roles.admin);
                if (!role) {
                    Logger.error(`Rôle administrateur non trouvé`, 'Tickets');
                }

                // Envoyer le message dans le nouveau canal avec la mention du rôle
                await ticketChannel.send({
                    content: role ? `${role}` : '',
                    embeds: [embed],
                    components: [row],
                });
            } catch (error) {
                console.error(error);
                await interaction.followUp({
                    content: 'Une erreur est survenue lors de la création du ticket.',
                    ephemeral: true,
                });
            }
        } else if (interaction.customId === 'close_ticket') {
            await interaction.deferReply({ ephemeral: true });

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('confirm_close')
                    .setLabel('Confirmer la Fermeture ⚠️')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId('reopen_ticket')
                    .setLabel('Annuler ❌')
                    .setStyle(ButtonStyle.Primary)
            );

            // Message de confirmation pour fermer le ticket
            await interaction.followUp({
                content: '⚠️ Êtes-vous sûr de vouloir fermer ce ticket ? Cette action nécessite une confirmation.',
                components: [row],
                ephemeral: true,
            });
        } else if (interaction.customId === 'confirm_close') {
            await interaction.deferReply({ ephemeral: false });
            const channelId = interaction.channelId;
            const user = interaction.user;

            const result = await pool.query('SELECT * FROM tickets WHERE channel_id = ?', [channelId]);
            const rows = result[0];
            if (result[0].length === 0) {
                return interaction.reply({ content: 'Ce ticket n\'existe pas.', ephemeral: true });
            }

            await pool.query('UPDATE tickets SET closed = 1 WHERE channel_id = ?', [channelId]);

            // Catégorie des tickets archivés
            const archivedCategoryId = config.discord.categories.ticketArchived;
            
            try {
                // Log de fermeture du ticket
                Logger.log(`Le ticket ${interaction.channel.name} (${channelId}) a été fermé par ${user.tag} (${user.id})`, 'Tickets');

                // Générer l'archive HTML
                const archiveFile = await TicketArchiver.generateTicketHTML(interaction.channel, user);
                
                // Envoyer la notification d'archive
                await TicketArchiver.sendArchiveNotification(interaction.client, interaction.channel, user, archiveFile);

                // Récupérer le rôle administrateur
                const adminRole = await interaction.guild.roles.fetch(config.discord.roles.admin);
                if (!adminRole) {
                    return interaction.reply({ content: 'Erreur: Le rôle administrateur n\'a pas été trouvé.', ephemeral: true });
                }

                // Mise à jour des permissions du canal
                await interaction.channel.permissionOverwrites.set([
                    {
                        id: interaction.guild.roles.everyone.id,
                        deny: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
                    },
                    {
                        id: adminRole.id,
                        allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
                    }
                ]);

                // Déplacer le ticket dans la catégorie d'archive
                await interaction.channel.setParent(archivedCategoryId);

                // Ajouter le bouton de suppression définitive
                const deleteRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('delete_ticket')
                        .setLabel('Supprimer définitivement ⛔')
                        .setStyle(ButtonStyle.Danger)
                );

                const embed = new EmbedBuilder()
                    .setColor('#FF0000')
                    .setTitle('Ticket Archivé 📁')
                    .setDescription(`Ce ticket a été fermé par ${user} et archivé.\n📋 L'historique complet a été sauvegardé et une notification a été envoyée.\nSeuls les administrateurs peuvent désormais y accéder.`)
                    .setTimestamp();

                if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply({ embeds: [embed], components: [deleteRow] });
                } else {
                    await interaction.followUp({ embeds: [embed], components: [deleteRow] });
                }
            } catch (error) {
                Logger.error(`Erreur lors de l'archivage du ticket ${interaction.channel.name}: ${error}`, 'Tickets');
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply({ content: 'Une erreur est survenue lors de l\'archivage du ticket.', ephemeral: true });
                } else {
                    await interaction.followUp({ content: 'Une erreur est survenue lors de l\'archivage du ticket.', ephemeral: true });
                }
            }
        } else if (interaction.customId === 'delete_ticket') {
            // Vérifier si l'utilisateur est administrateur
            if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                Logger.log(`Tentative de suppression du ticket ${interaction.channel.name} refusée pour ${interaction.user.tag} (${interaction.user.id}) - Permissions insuffisantes`, 'Tickets');
                return interaction.reply({ content: 'Seuls les administrateurs peuvent supprimer définitivement un ticket.', ephemeral: true });
            }

            // Log de suppression du ticket
            Logger.log(`Le ticket ${interaction.channel.name} va être supprimé par ${interaction.user.tag} (${interaction.user.id})`, 'Tickets');

            await interaction.reply({ content: 'Le ticket va être supprimé définitivement dans 5 secondes...', ephemeral: false });
            
            // Log final avant la suppression
            setTimeout(async () => {
                try {
                    Logger.log(`Suppression du ticket ${interaction.channel.name} par ${interaction.user.tag} (${interaction.user.id})`, 'Tickets');
                    await interaction.channel.delete();
                } catch (error) {
                    Logger.error(`Erreur lors de la suppression du ticket ${interaction.channel.name}: ${error}`, 'Tickets');
                }
            }, 5000);
        } else if (interaction.customId === 'reopen_ticket') {
            const channelId = interaction.channelId;
            const user = interaction.user;

            const [rows] = await pool.query('SELECT * FROM tickets WHERE channel_id = ?', [channelId]);
            if (result[0].length === 0) {
                return interaction.reply({ content: 'Ce ticket n\'existe pas.', ephemeral: true });
            }

            await pool.query('UPDATE tickets SET closed = 0 WHERE channel_id = ?', [channelId]);

            console.log(`Le ticket dans le salon ${interaction.channel.name} (${channelId}) a été réouvert par ${user.tag}.`);

            await interaction.reply({ content: `Le ticket a été réouvert par ${user.tag}.`, ephemeral: false });
        } else if (interaction.customId === 'take_ticket') {
            const channelId = interaction.channelId;
            const user = interaction.user;

            const [rows] = await pool.query('SELECT * FROM tickets WHERE channel_id = ?', [channelId]);
            if (result[0].length === 0) {
                return interaction.reply({ content: 'Ce ticket n\'existe pas.', ephemeral: true });
            }

            await pool.query('UPDATE tickets SET assigned_to = ? WHERE channel_id = ?', [user.id, channelId]);

            console.log(`${user.tag} a pris en charge le ticket dans le salon ${interaction.channel.name}.`);

            // Embed pour signaler que l'utilisateur a pris en charge le ticket
            const embed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('Ticket Prise en Charge ✅')
                .setDescription(`${user} a pris en charge ce ticket.`);

            await interaction.reply({ content: 'Vous avez pris en charge ce ticket.', ephemeral: true });
            await interaction.channel.send({ embeds: [embed] });
        } else if (interaction.customId === 'unassign_ticket') {
            const channelId = interaction.channelId;
            const user = interaction.user;

            const [rows] = await pool.query('SELECT * FROM tickets WHERE channel_id = ?', [channelId]);
            if (result[0].length === 0) {
                return interaction.reply({ content: 'Ce ticket n\'existe pas.', ephemeral: true });
            }

            await pool.query('UPDATE tickets SET assigned_to = NULL WHERE channel_id = ?', [channelId]);

            console.log(`${user.tag} n\'a plus pris en charge le ticket dans le salon ${interaction.channel.name}.`);

            // Embed pour signaler que l'utilisateur ne prend plus en charge le ticket
            const embed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('Ticket Non Prise en Charge ❌')
                .setDescription(`${user} ne prend plus en charge ce ticket.`);

            await interaction.reply({ content: 'Vous n\'avez plus pris en charge ce ticket.', ephemeral: true });
            await interaction.channel.send({ embeds: [embed] });
        }
    },
};