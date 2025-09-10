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
    async sendTicketPanelC(client, channelId) {
        try {
            Logger.log('\x1b[32mDébut de l\'envoie du panneau de ticket des candidatures dans le salon (ID) ✅ : \x1b[0m' + channelId, 'TicketsC');
            
            const channel = await client.channels.fetch(channelId);
            if (!channel) {
                Logger.error('Canal non trouvé avec l\'ID: ' + channelId, 'TicketsC');
                return;
            }
        
            // Vérifie si un message a été enregistré pour ce salon
            const result = await pool.query('SELECT * FROM ticketsC WHERE channel_idC = ?', [channelId]);
        
const rows = result[0];
            if (result[0].length > 0) {
                const messageId = rows[0].message_idC;
                Logger.log('\x1b[32mMessage ID trouvé dans la base de données ✅ : \x1b[0m' + messageId, 'TicketsC');
        
                try {
                    // Vérifie si le message existe toujours dans le salon
                    const message = await channel.messages.fetch(messageId);
                    if (message) {
                        Logger.log('\x1b[32mPanneau de ticket existant trouvé, pas besoin de le recréer ✅\x1b[0m', 'TicketsC');
                        return;
                    }
                } catch (error) {
                    Logger.log('Message non trouvé dans Discord, création d\'un nouveau message', 'TicketsC');
                    // On ne supprime pas l'entrée tout de suite, on la mettra à jour plus tard
                }
            }
        
            Logger.log('Création du nouveau message...', 'TicketsC');
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('create_ticketC')
                    .setLabel('🎫 Ouvrir un ticket')
                    .setStyle(ButtonStyle.Primary)
            );

            const embed = new EmbedBuilder()
                .setColor('#000000')
                .setTitle('📨・Candidature - O\'Sheas Barber')
                .setFooter({ text: 'Secrétaire du O\'Sheas Barbers - Développé par Nathan Pablosco ❤️', iconURL: client.user.displayAvatarURL() })
                .setDescription('Vous souhaitez devenir coiffeur et vous appréciez le contact avec les gens ? O\'Sheas Barbers est l\'endroit parfait pour vous :barber:   ! N\'attendez plus et postulez dès maintenant  !\n\n**Prérequis 📁:**\n\n➡️ Avoir lu et accepté le règlement de la Radio D.\n➡️ Être âgé d’au moins 18 ans.\n➡️ Posséder une carte d’identité nationale, un passeport ou un visa valide.\n➡️ Avoir un langage oral soigné et apprécier le contact humain.\n➡️ Être passionné par la coiffure.\n\n**Comment postuler ?**\n\n1️⃣ Cliquez sur ce lien pour accéder au formulaire de candidature :\nLien vers le formulaire : https://docs.google.com/forms/d/e/1FAIpQLSe6-hcsqVgtjA41-6gCl1Y2j2rY6ad1sI3gO49hc2FNpea0QA/viewform\n2️⃣ Une fois sur la page, cliquez sur "Fichier" en haut à gauche.\n3️⃣ Sélectionnez "Créer une copie" pour remplir le document.\n\n***Bonne chance à tous les candidats ! 🌟***');

            const message = await channel.send({ embeds: [embed], components: [row] });
            Logger.log('Nouveau message envoyé avec succès, ID: ' + message.id, 'TicketsC');

            // Mise à jour ou insertion dans la base de données
            if (result[0].length > 0) {
                await pool.query('UPDATE ticketsC SET message_idC = ? WHERE channel_idC = ?', [message.id, channelId]);
                Logger.log('Message ID mis à jour dans la base de données', 'TicketsC');
            } else {
                await pool.query('INSERT INTO ticketsC (channel_idC, message_idC, user_idC, guild_idC) VALUES (?, ?, ?, ?)', [
                    channelId,
                    message.id,
                    client.user.id,  // ID du bot comme créateur du message
                    channel.guild.id
                ]);
                Logger.log('Nouvelle entrée créée dans la base de données', 'TicketsC');
            }
        } catch (error) {
            Logger.error('Erreur dans sendTicketPanelC: ' + error, 'TicketsC');
            throw error;
        }
    },

    async handleInteractionC(interaction) {
        if (interaction.customId === 'create_ticketC') {
            try {
                // Répond immédiatement
                await interaction.reply({ 
                    content: 'Chargement...',
                    ephemeral: true 
                });

                const row = new ActionRowBuilder().addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId('select_ticket_topicC')
                        .setPlaceholder('Choisissez un sujet...')
                        .addOptions([
                            {
                                label: '📁 Candidater au O\'Sheas Barber',
                                description: 'Pour candidater au O\'Sheas Barbers en envoyant son formulaire.',
                                value: 'support_techC',
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
        } else if (interaction.customId === 'select_ticket_topicC') {
            await interaction.deferReply({ ephemeral: true });

            const selectedOption = interaction.values[0];
            const user = interaction.user;
            const guild = interaction.guild;

            let categoryId;
            switch (selectedOption) {
                case 'support_techC':
                    categoryId = config.discord.categories.ticketCandidature;
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
                    name: `ticketC-${user.username}`,
                    type: 0,
                    parent: categoryId, // Utiliser la catégorie du switch
                    permissionOverwrites: [...categoryPermissions, userPermission],
                });

                await pool.query('INSERT INTO ticketsC (user_idC, channel_idC, guild_idC) VALUES (?, ?, ?)', [
                    user.id,
                    ticketChannel.id,
                    guild.id,
                ]);

                Logger.log(`Nouveau ticket créé: ${ticketChannel.name} par ${user.tag} (${user.id})`, 'TicketsC');

                // Envoie un message de confirmation sans embed
                await interaction.followUp({
                    content: `Votre ticket a bien été créé dans la catégorie appropriée : ${ticketChannel}.`,
                    ephemeral: true,
                });

                // Crée un bouton pour fermer et prendre en charge le ticket
                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('close_ticketC')
                        .setLabel('Fermer le ticket ❌')
                        .setStyle(ButtonStyle.Danger),
                    new ButtonBuilder()
                        .setCustomId('take_ticketC')
                        .setLabel('Prendre en charge 🛠️')
                        .setStyle(ButtonStyle.Success),
                    new ButtonBuilder()
                        .setCustomId('unassign_ticketC')
                        .setLabel('Ne plus prendre en charge 🚫')
                        .setStyle(ButtonStyle.Secondary)
                );

                // Crée l'embed pour le ticket
                const embed = new EmbedBuilder()
                    .setColor('#000000') // Choisis la couleur que tu préfères
                    .setFooter({ text: 'Secrétaire du O\'Sheas Barbers - Développé par Nathan Pablosco ❤️', iconURL: interaction.client.user.displayAvatarURL() })
                    .setDescription('Bonjour 👋,\n\n**__Merci de nous indiquer les choses suivantes :__**\n\n➥ Nom/Prénom :\n➥ Numéro de téléphone :\n➥ Motif de la demande :\n\n**Remplir ce formulaire :**  https://docs.google.com/forms/d/e/1FAIpQLSe6-hcsqVgtjA41-6gCl1Y2j2rY6ad1sI3gO49hc2FNpea0QA/viewform?usp=dialog');

                // ID du rôle à mentionner
                const role = await guild.roles.fetch(config.discord.roles.admin);
                if (!role) {
                    Logger.error(`Rôle administrateur non trouvé`, 'TicketsC');
                }

                // Envoie un message dans le salon du ticket avec l'embed et mention du rôle
                await ticketChannel.send({
                    content: role ? `${role}` : '', // Mention du rôle au lieu de l'utilisateur
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
        } else if (interaction.customId === 'close_ticketC') {
            await interaction.deferReply({ ephemeral: true });

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('confirm_closeC')
                    .setLabel('Confirmer la Fermeture ⚠️')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId('reopen_ticketC')
                    .setLabel('Annuler ❌')
                    .setStyle(ButtonStyle.Primary)
            );

            // Message de confirmation pour fermer le ticket
            await interaction.followUp({
                content: '⚠️ Êtes-vous sûr de vouloir fermer ce ticket ? Cette action nécessite une confirmation.',
                components: [row],
                ephemeral: true,
            });
        } else if (interaction.customId === 'confirm_closeC') {
            await interaction.deferReply({ ephemeral: false });
            const channelId = interaction.channelId;
            const user = interaction.user;

            const result = await pool.query('SELECT * FROM ticketsC WHERE channel_idC = ?', [channelId]);
            const rows = result[0];
            if (result[0].length === 0) {
                return interaction.reply({ content: 'Ce ticket n\'existe pas.', ephemeral: true });
            }

            await pool.query('UPDATE ticketsC SET closedC = 1 WHERE channel_idC = ?', [channelId]);

            // Catégorie des tickets archivés
            const archivedCategoryId = config.discord.categories.ticketArchived;
            
            try {
                // Log de fermeture du ticket
                Logger.log(`Le ticket ${interaction.channel.name} (${channelId}) a été fermé par ${user.tag} (${user.id})`, 'TicketsC');

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
                        .setCustomId('delete_ticketC')
                        .setLabel('Supprimer définitivement ⛔')
                        .setStyle(ButtonStyle.Danger)
                );

                const embed = new EmbedBuilder()
                    .setColor('#FF0000')
                    .setTitle('Ticket Candidature Archivé 📁')
                    .setDescription(`Ce ticket de candidature a été fermé par ${user} et archivé.\n📋 L'historique complet a été sauvegardé et une notification a été envoyée.\nSeuls les administrateurs peuvent désormais y accéder.`)
                    .setTimestamp();

                if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply({ embeds: [embed], components: [deleteRow] });
                } else {
                    await interaction.followUp({ embeds: [embed], components: [deleteRow] });
                }
            } catch (error) {
                Logger.error(`Erreur lors de l'archivage du ticket ${interaction.channel.name}: ${error}`, 'TicketsC');
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply({ content: 'Une erreur est survenue lors de l\'archivage du ticket.', ephemeral: true });
                } else {
                    await interaction.followUp({ content: 'Une erreur est survenue lors de l\'archivage du ticket.', ephemeral: true });
                }
            }
        } else if (interaction.customId === 'delete_ticketC') {
            // Vérifier si l'utilisateur est administrateur
            if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                Logger.log(`Tentative de suppression du ticket ${interaction.channel.name} refusée pour ${interaction.user.tag} (${interaction.user.id}) - Permissions insuffisantes`, 'TicketsC');
                return interaction.reply({ content: 'Seuls les administrateurs peuvent supprimer définitivement un ticket.', ephemeral: true });
            }

            // Log de suppression du ticket
            Logger.log(`Le ticket ${interaction.channel.name} va être supprimé par ${interaction.user.tag} (${interaction.user.id})`, 'TicketsC');

            await interaction.reply({ content: 'Le ticket va être supprimé définitivement dans 5 secondes...', ephemeral: false });
            
            // Log final avant la suppression
            setTimeout(async () => {
                try {
                    Logger.log(`Suppression du ticket ${interaction.channel.name} par ${interaction.user.tag} (${interaction.user.id})`, 'TicketsC');
                    await interaction.channel.delete();
                } catch (error) {
                    Logger.error(`Erreur lors de la suppression du ticket ${interaction.channel.name}: ${error}`, 'TicketsC');
                }
            }, 5000);
        } else if (interaction.customId === 'reopen_ticketC') {
            const channelId = interaction.channelId;
            const user = interaction.user;

            const result = await pool.query('SELECT * FROM ticketsC WHERE channel_idC = ?', [channelId]);
            if (result[0].length === 0) {
const rows = result[0];
                return interaction.reply({ content: 'Ce ticket n\'existe pas.', ephemeral: true });
            }

            await pool.query('UPDATE ticketsC SET closedC = 0 WHERE channel_idC = ?', [channelId]);

            console.log(`Le ticket dans le salon ${interaction.channel.name} (${channelId}) a été réouvert par ${user.tag}.`);

            await interaction.reply({ content: `Le ticket a été réouvert par ${user.tag}.`, ephemeral: false });
        } else if (interaction.customId === 'take_ticketC') {
            const channelId = interaction.channelId;
            const user = interaction.user;

            const result = await pool.query('SELECT * FROM ticketsC WHERE channel_idC = ?', [channelId]);
            if (result[0].length === 0) {
const rows = result[0];
                return interaction.reply({ content: 'Ce ticket n\'existe pas.', ephemeral: true });
            }

            await pool.query('UPDATE ticketsC SET assigned_toC = ? WHERE channel_idC = ?', [user.id, channelId]);

            console.log(`${user.tag} a pris en charge le ticket dans le salon ${interaction.channel.name}.`);

            // Embed pour signaler que l'utilisateur a pris en charge le ticket
            const embed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('Ticket Prise en Charge ✅')
                .setDescription(`${user} a pris en charge ce ticket.`);

            await interaction.reply({ content: 'Vous avez pris en charge ce ticket.', ephemeral: true });
            await interaction.channel.send({ embeds: [embed] });
        } else if (interaction.customId === 'unassign_ticketC') {
            const channelId = interaction.channelId;
            const user = interaction.user;

            const result = await pool.query('SELECT * FROM ticketsC WHERE channel_idC = ?', [channelId]);
            if (result[0].length === 0) {
const rows = result[0];
                return interaction.reply({ content: 'Ce ticket n\'existe pas.', ephemeral: true });
            }

            await pool.query('UPDATE ticketsC SET assigned_toC = NULL WHERE channel_idC = ?', [channelId]);

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