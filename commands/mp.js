const { SlashCommandBuilder } = require('discord.js');
const Logger = require('../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mp')
        .setDescription('Envoyer un message privé à un utilisateur')
        .addUserOption(option =>
            option.setName('utilisateur')
                .setDescription('L\'utilisateur à qui envoyer le message')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('message')
                .setDescription('Le message à envoyer (utilisez #n pour les sauts de ligne)')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('image')
                .setDescription('URL de l\'image à joindre au message')
                .setRequired(false)),

    async execute(interaction) {
        try {
            await interaction.deferReply({ ephemeral: true });

            const targetUser = interaction.options.getUser('utilisateur');
            let message = interaction.options.getString('message');
            const imageUrl = interaction.options.getString('image');

            // Remplacer #n par des sauts de ligne
            message = message.replace(/#n/g, '\n');

            // Préparer les options du message
            const messageOptions = { content: message };

            // Ajouter l'image si une URL est fournie
            if (imageUrl) {
                if (!isValidUrl(imageUrl)) {
                    return await interaction.editReply({
                        content: 'L\'URL de l\'image fournie n\'est pas valide.',
                        ephemeral: true
                    });
                }
                messageOptions.files = [{ attachment: imageUrl }];
            }

            // Envoyer le message privé
            await targetUser.send(messageOptions);

            // Log l'action
            Logger.log(`Message privé envoyé à ${targetUser.tag} par ${interaction.user.tag}`, 'MP');

            await interaction.editReply({
                content: `Message envoyé avec succès à ${targetUser.tag} !`,
                ephemeral: true
            });

        } catch (error) {
            Logger.error(`Erreur lors de l'envoi du message privé: ${error}`, 'MP');
            await interaction.editReply({
                content: 'Une erreur est survenue lors de l\'envoi du message privé. L\'utilisateur a peut-être désactivé les messages privés.',
                ephemeral: true
            });
        }
    }
};

// Fonction pour valider l'URL
function isValidUrl(string) {
    try {
        new URL(string);
        return true;
    } catch (_) {
        return false;
    }
}