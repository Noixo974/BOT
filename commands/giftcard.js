const { SlashCommandBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, EmbedBuilder, ChannelType, PermissionsBitField, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const { pool } = require('../db');
const Logger = require('../utils/logger');
const config = require('../config/config');

// Fonction pour envoyer un log dans le salon dédié
async function sendGiftCardLog(interaction, title, description, color) {
    try {
        const logsChannel = await interaction.client.channels.fetch(config.discord.channels.giftCardLogs);
        if (!logsChannel) {
            Logger.error('Salon de logs introuvable', 'GiftCard');
            return;
        }

        // Obtenir le membre du serveur pour avoir accès au nickname
        const member = interaction.member;
        const userDisplay = member ? member.displayName : interaction.user.username;

        // Remplacer les ":" dans la description pour ajouter un espace après
        const formattedDescription = description.replace(/:\*\*/g, ' : **').replace(/:/g, ' : ');

        const embed = new EmbedBuilder()
            .setColor(color)
            .setTitle(title)
            .setDescription(formattedDescription.replace(interaction.user.tag, userDisplay))
            .setTimestamp()
            .setFooter({ 
                text: 'Secrétaire du O\'Sheas Barbers - Développé par Nathan Pablosco ❤️',
                iconURL: interaction.client.user.displayAvatarURL()
            });

        await logsChannel.send({ embeds: [embed] });
    } catch (error) {
        Logger.error('Erreur lors de l\'envoi du log : ' + error, 'GiftCard');
    }
}

// Fonction pour générer un code unique à 8 chiffres
async function genererCodeUnique() {
    while (true) {
        const code = Math.floor(10000000 + Math.random() * 90000000).toString();
        const result = await pool.execute('SELECT code FROM cartes_cadeaux WHERE code = ?', [code]);
        const rows = result[0];
        if (result[0].length === 0) return code;
    }
}

// Initialisation de la table dans la base de données
async function initTableCarteCadeau() {
    try {
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS cartes_cadeaux (
                code VARCHAR(8) PRIMARY KEY,
                montant DECIMAL(10,2) NOT NULL,
                date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        Logger.log('\x1b[32mBase de données des cartes cadeaux initialisée avec succès ✅\x1b[0m', 'Database');
    } catch (error) {
        Logger.error('Erreur lors de l\'initialisation de la table cartes_cadeaux:', error);
    }
}

module.exports = {
    initTableCarteCadeau,
    data: new SlashCommandBuilder()
        .setName('cartecadeau')
        .setDescription('Système de cartes cadeaux'),

    async execute(interaction) {
        // Vérification des permissions dans le salon actuel
        const permissions = interaction.channel.permissionsFor(interaction.client.user);
        if (!permissions || !permissions.has(PermissionsBitField.Flags.SendMessages)) {
            return interaction.reply({
                content: "Je n'ai pas la permission d'envoyer des messages dans ce salon.",
                ephemeral: true
            });
        }

        // Création des boutons
        const boutonCreer = new ButtonBuilder()
            .setCustomId('creer_cartecadeau')
            .setLabel('Créer une carte cadeau 🎁')
            .setStyle(ButtonStyle.Primary);

        const boutonVerifier = new ButtonBuilder()
            .setCustomId('verifier_cartecadeau')
            .setLabel('Modifier une carte cadeau 📂')
            .setStyle(ButtonStyle.Secondary);

        const boutonListe = new ButtonBuilder()
            .setCustomId('liste_cartecadeau')
            .setLabel('Voir toutes les cartes cadeaux 👁️')
            .setStyle(ButtonStyle.Success);

        const boutonSupprimer = new ButtonBuilder()
            .setCustomId('supprimer_cartecadeau')
            .setLabel('Supprimer une carte cadeau 🗑️')
            .setStyle(ButtonStyle.Danger);

        const row = new ActionRowBuilder()
            .addComponents(boutonCreer, boutonVerifier, boutonListe, boutonSupprimer);

        // Création de l'embed
        const embed = new EmbedBuilder()
            .setColor('#000000')
            .setTitle('Cartes cadeaux 🎁')
            .setDescription('Utilisez les boutons ci-dessous pour gérer les cartes cadeaux des clients. ⚙️')
            .addFields(
                { name: 'Créer une carte cadeau 📝', value: 'Créez une nouvelle carte cadeau avec un montant spécifique. ⚙️' },
                { name: 'Utiliser une carte cadeau 📥', value: 'Vérifiez le solde ou utilisez une carte cadeau existante. ⚙️' },
                { name: 'Supprimer une carte cadeau 🗑️', value: 'Supprimez une carte cadeau existante. ⚙️' },
                { name : 'E-Carte Cadeau 💳', value: 'Remplir cette carte cadeau : https://urlr.me/WaxANz ⚙️'}
            )
            .setFooter({ text: 'Secrétaire du O\'Sheas Barbers - Développé par Nathan Pablosco ❤️', iconURL: interaction.client.user.displayAvatarURL() });

        await interaction.channel.send({ embeds: [embed], components: [row] });
        await interaction.reply({
            content: `✅ Le message du système de cartes cadeaux a été envoyé dans le salon ${interaction.channel}`,
            ephemeral: true
        });

        // Log de l'initialisation du système
        await sendGiftCardLog(
            interaction,
            '🎮 Initialisation du Système de Cartes Cadeaux',
            `**Initialisé par : ** ${interaction.user.tag}\n**Salon : ** ${interaction.channel.name}`,
            '#808080' // Gris
        );
    },

    async handleButtons(interaction) {
        if (interaction.customId === 'creer_cartecadeau') {
            const modal = new ModalBuilder()
                .setCustomId('modal_creation_carte')
                .setTitle('Créer une carte cadeau 🎁');

            const montantInput = new TextInputBuilder()
                .setCustomId('montant_carte')
                .setLabel('Montant de la carte cadeau 💰')
                .setPlaceholder('Entrez le montant (Exemple : 300 ou 500)')
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            const firstActionRow = new ActionRowBuilder().addComponents(montantInput);
            modal.addComponents(firstActionRow);

            await interaction.showModal(modal);
        }

        if (interaction.customId === 'verifier_cartecadeau') {
            const modal = new ModalBuilder()
                .setCustomId('modal_verification_carte')
                .setTitle('Modifier une carte cadeau 📂');

            const codeInput = new TextInputBuilder()
                .setCustomId('code_carte')
                .setLabel('Code de la carte cadeau 💳')
                .setPlaceholder('Entrez le code à 8 chiffres 🔐')
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            const firstActionRow = new ActionRowBuilder().addComponents(codeInput);
            modal.addComponents(firstActionRow);

            await interaction.showModal(modal);
        }

        if (interaction.customId.startsWith('utiliser_carte_')) {
            const code = interaction.customId.replace('utiliser_carte_', '');
            const modal = new ModalBuilder()
                .setCustomId(`modal_utilisation_carte_${code}`)
                .setTitle('Utiliser la carte cadeau');

            const montantInput = new TextInputBuilder()
                .setCustomId('montant_utilisation')
                .setLabel('Montant à Utiliser ou Ajouter 💰')
                .setPlaceholder('Entrez le montant (Exemple : (Utiliser : 50) ou (Ajouter : 100))')
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            const firstActionRow = new ActionRowBuilder().addComponents(montantInput);
            modal.addComponents(firstActionRow);

            await interaction.showModal(modal);
        }

        if (interaction.customId.startsWith('voir_solde_')) {
            const code = interaction.customId.replace('voir_solde_', '');
            try {
                const result = await pool.execute(
                    'SELECT montant FROM cartes_cadeaux WHERE code = ?',
                    [code]
                );

                // Log de consultation du solde
                await sendGiftCardLog(
                    interaction,
                    '👁️ Consultation du Solde',
                    `**Consulté par : ** ${interaction.user.tag}\n**Code : ** ${code}\n**Solde : ** ${cartes[0].montant}€`,
                    '#808080' // Gris
                );

                await interaction.reply({
                    content: `Solde actuel de la carte cadeau 📉 : ${cartes[0].montant}€`,
                    ephemeral: true
                });
            } catch (error) {
                Logger.error('Erreur lors de la vérification du solde:', error);
                await interaction.reply({
                    content: `Une erreur est survenue lors de la vérification du solde. Erreur: ${error.message}`,
                    ephemeral: true
                });
            }
        }

        if (interaction.customId === 'liste_cartecadeau') {
            await interaction.deferReply({ ephemeral: true });
            try {
                const result = await pool.execute(
                    'SELECT code, montant, date_creation FROM cartes_cadeaux ORDER BY date_creation DESC'
                );

                if (cartes.length === 0) {
                    await interaction.editReply({
                        content: 'Aucune carte cadeau n\'existe actuellement.',
                        ephemeral: true
                    });
                    return;
                }

                // Log de consultation de la liste
                await sendGiftCardLog(
                    interaction,
                    '📋 Consultation de la Liste des Cartes',
                    `**Consulté par : ** ${interaction.user.tag}\n**Nombre de cartes : ** ${cartes.length}`,
                    '#808080' // Gris
                );

                const embeds = [];
                for (let i = 0; i < cartes.length; i += 25) {
                    const groupe = cartes.slice(i, i + 25);
                    const embed = new EmbedBuilder()
                        .setColor('#000000')
                        .setTitle(`Liste des Cartes Cadeaux (Page ${Math.floor(i/25) + 1})`);

                    groupe.forEach((carte, index) => {
                        const date = new Date(carte.date_creation).toLocaleDateString('fr-FR');
                        embed.addFields({
                            name: `Carte ${index + 1 + i}`,
                            value: `Code : ${carte.code}\nMontant : ${carte.montant}€\nCréée le : ${date}`,
                            inline: false
                        });
                    });

                    embeds.push(embed);
                }

                await interaction.editReply({
                    embeds: embeds,
                    ephemeral: true
                });
            } catch (error) {
                Logger.error('Erreur lors de la récupération de la liste des cartes:', error);
                await interaction.editReply({
                    content: `Une erreur est survenue lors de la récupération de la liste des cartes. Erreur: ${error.message}`,
                    ephemeral: true
                });
            }
        }

        if (interaction.customId === 'supprimer_cartecadeau') {
            const modal = new ModalBuilder()
                .setCustomId('modal_suppression_carte')
                .setTitle('Supprimer une carte cadeau 🗑️');

            const codeInput = new TextInputBuilder()
                .setCustomId('code_carte')
                .setLabel('Code de la carte cadeau à supprimer 📝')
                .setPlaceholder('Entrez le code à 8 chiffres 🔐')
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            const firstActionRow = new ActionRowBuilder().addComponents(codeInput);
            modal.addComponents(firstActionRow);

            await interaction.showModal(modal);
        }
    },

    async handleModals(interaction) {
        if (interaction.customId === 'modal_creation_carte') {
            const montant = parseFloat(interaction.fields.getTextInputValue('montant_carte'));

            if (isNaN(montant)) {
                await interaction.reply({
                    content: 'Montant invalide. Veuillez entrer un nombre valide.',
                    ephemeral: true
                });
                return;
            }

            try {
                const code = await genererCodeUnique();
                await pool.execute(
                    'INSERT INTO cartes_cadeaux (code, montant) VALUES (?, ?)',
                    [code, montant]
                );

                // Log de création
                await sendGiftCardLog(
                    interaction,
                    '🎁 Création d\'une Carte Cadeau',
                    `**Créateur : ** ${interaction.user.tag}\n**Code : ** ${code}\n**Montant : ** ${montant}€`,
                    '#00FF00' // Vert
                );

                await interaction.reply({
                    content: `Carte cadeau créée avec succès 💳 !\n\nCode : ${code}\n\nMontant : ${montant}€`,
                    ephemeral: true
                });
            } catch (error) {
                Logger.error('Erreur lors de la création de la carte:', error);
                await interaction.reply({
                    content: `Une erreur est survenue lors de la création de la carte. Erreur: ${error.message}`,
                    ephemeral: true
                });
            }
        }

        if (interaction.customId === 'modal_verification_carte') {
            const code = interaction.fields.getTextInputValue('code_carte');
            
            try {
                const result = await pool.execute(
                    'SELECT montant FROM cartes_cadeaux WHERE code = ?',
                    [code]
                );

                if (cartes.length === 0) {
                    await interaction.reply({
                        content: 'Cette carte cadeau n\'existe pas.',
                        ephemeral: true
                    });
                    return;
                }

                const utiliserButton = new ButtonBuilder()
                    .setCustomId(`utiliser_carte_${code}`)
                    .setLabel('Utiliser ou Ajouter un montant 📊')
                    .setStyle(ButtonStyle.Primary);

                const soldeButton = new ButtonBuilder()
                    .setCustomId(`voir_solde_${code}`)
                    .setLabel('Voir le solde 🏦')
                    .setStyle(ButtonStyle.Secondary);

                const row = new ActionRowBuilder()
                    .addComponents(utiliserButton, soldeButton);

                // Log de vérification
                await sendGiftCardLog(
                    interaction,
                    '🔍 Vérification d\'une Carte Cadeau',
                    `**Vérifié par : ** ${interaction.user.tag}\n**Code : ** ${code}\n**Solde actuel : ** ${cartes[0].montant}€`,
                    '#808080' // Gris
                );

                await interaction.reply({
                    content: `Carte cadeau trouvée 💳 ! Solde actuel de la carte cadeau 💰 : ${cartes[0].montant}€\n\nQue souhaitez-vous faire sur la carte : ${code} ?\n\n`,
                    components: [row],
                    ephemeral: true
                });
            } catch (error) {
                Logger.error('Erreur lors de la vérification de la carte:', error);
                await interaction.reply({
                    content: `Une erreur est survenue lors de la vérification de la carte. Erreur: ${error.message}`,
                    ephemeral: true
                });
            }
        }

        if (interaction.customId.startsWith('modal_utilisation_carte_')) {
            const code = interaction.customId.replace('modal_utilisation_carte_', '');
            const montantInput = interaction.fields.getTextInputValue('montant_utilisation');

            try {
                const result = await pool.execute(
                    'SELECT montant FROM cartes_cadeaux WHERE code = ?',
                    [code]
                );

                const montant = parseFloat(montantInput);
                if (isNaN(montant)) {
                    await interaction.reply({
                        content: 'Montant invalide.',
                        ephemeral: true
                    });
                    return;
                }

                if (montant > cartes[0].montant) {
                    await interaction.reply({
                        content: 'Solde insuffisant sur la carte.',
                        ephemeral: true
                    });
                    return;
                }

                const nouveauMontant = cartes[0].montant - montant;
                await pool.execute(
                    'UPDATE cartes_cadeaux SET montant = ? WHERE code = ?',
                    [nouveauMontant, code]
                );

                // Log de modification
                await sendGiftCardLog(
                    interaction,
                    '💳 Utilisation d\'une Carte Cadeau',
                    `**Utilisateur : ** ${interaction.user.tag}\n**Code : ** ${code}\n**Montant utilisé : ** ${montant}€\n**Nouveau solde : ** ${nouveauMontant}€`,
                    '#0000FF' // Bleu
                );

                await interaction.reply({
                    content: `Transaction effectuée!\nMontant utilisé : ${montant}€\nNouveau solde : ${nouveauMontant}€`,
                    ephemeral: true
                });
            } catch (error) {
                Logger.error('Erreur lors de l\'utilisation de la carte:', error);
                await interaction.reply({
                    content: `Une erreur est survenue lors de l'utilisation de la carte. Erreur: ${error.message}`,
                    ephemeral: true
                });
            }
        }

        if (interaction.customId === 'modal_suppression_carte') {
            const code = interaction.fields.getTextInputValue('code_carte');
            
            try {
                const result = await pool.execute(
                    'SELECT montant FROM cartes_cadeaux WHERE code = ?',
                    [code]
                );

                if (cartes.length === 0) {
                    await interaction.reply({
                        content: 'Cette carte cadeau n\'existe pas.',
                        ephemeral: true
                    });
                    return;
                }

                const montant = cartes[0].montant;

                await pool.execute(
                    'DELETE FROM cartes_cadeaux WHERE code = ?',
                    [code]
                );

                // Log de suppression
                await sendGiftCardLog(
                    interaction,
                    '🗑️ Suppression d\'une Carte Cadeau',
                    `**Supprimé par : ** ${interaction.user.tag}\n**Code : ** ${code}\n**Montant restant : ** ${montant}€`,
                    '#FF0000' // Rouge
                );

                await interaction.reply({
                    content: `La carte cadeau ${code} a été supprimée avec succès. 🗑️`,
                    ephemeral: true
                });

                Logger.log(`Carte cadeau ${code} supprimée avec succès`, 'GiftCard');
            } catch (error) {
                Logger.error('Erreur lors de la suppression de la carte:', error);
                await interaction.reply({
                    content: `Une erreur est survenue lors de la suppression de la carte. Erreur: ${error.message}`,
                    ephemeral: true
                });
            }
        }
    }
};