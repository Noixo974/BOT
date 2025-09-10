const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mess')
        .setDescription('Envoyer un message anonyme ou répondre à un message existant')
        .addStringOption(option =>
            option.setName('message')
                .setDescription('Le message à envoyer (utilisez #n pour sauter des lignes)')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('message_id')
                .setDescription('ID du message auquel répondre (laisser vide pour envoyer un nouveau message)')
                .setRequired(false)
        )
        .addStringOption(option =>
            option.setName('image_url')
                .setDescription('URL de l\'image à joindre (facultatif)')
                .setRequired(false)
        ),
    async execute(interaction) {
        const message = interaction.options.getString('message').replace(/\#n/g, '\n'); // Remplace \n par de vrais sauts de ligne
        const messageId = interaction.options.getString('message_id');
        const imageUrl = interaction.options.getString('image_url'); // Récupérer l'URL de l'image si fournie

        if (messageId) {
            try {
                // Récupérer le message cible
                const targetMessage = await interaction.channel.messages.fetch(messageId);

                // Construire l'objet de réponse
                const replyContent = { content: message };
                if (imageUrl) {
                    replyContent.files = [imageUrl];
                }

                // Répondre au message cible
                await targetMessage.reply(replyContent);

                // Confirmer l'envoi à l'utilisateur
                await interaction.reply({ content: 'Réponse envoyée avec succès.', ephemeral: true });
            } catch (error) {
                console.error(error);
                await interaction.reply({ content: 'Message non trouvé ou erreur lors de l\'envoi de la réponse.', ephemeral: true });
            }
        } else {
            try {
                // Construire l'objet du nouveau message
                const messageContent = { content: message };
                if (imageUrl) {
                    messageContent.files = [imageUrl];
                }

                // Envoyer un nouveau message
                await interaction.channel.send(messageContent);

                // Confirmer l'envoi à l'utilisateur
                await interaction.reply({ content: 'Message envoyé avec succès.', ephemeral: true });
            } catch (error) {
                console.error(error);
                await interaction.reply({ content: 'Erreur lors de l\'envoi du message.', ephemeral: true });
            }
        }
    }
};