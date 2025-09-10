const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
require('dotenv').config();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('acandid')
        .setDescription('Informer sur le statut de la candidature en cours : En attente'),
    async execute(interaction) {
        try {
            await interaction.deferReply();

            const gifURL = 'https://i.imgur.com/4C7DdOe.gif';

            const embed = new EmbedBuilder()
                .setColor('#000000')
                .setTitle('Statut de votre candidature : En attente ⌛')
                .setDescription(`Votre candidature a bien été prise en compte, celle-ci est donc en cours d'étude par l'équipe de recrutement. Nous revenons vers vous prochainement.`)
                .setThumbnail(gifURL) // Ajoute le GIF comme miniature à droite
                .setFooter({ text: 'Secrétaire du O\'Sheas Barbers - Développé par Nathan Pablosco ❤️', iconURL: interaction.client.user.displayAvatarURL() });

            await interaction.editReply({
                embeds: [embed],
                ephemeral: false
            });

            console.log('Message envoyé:', embed.description);
        } catch (error) {
            console.error('Erreur lors de la création du message:', error);
            await interaction.editReply({ content: 'Une erreur est survenue lors de la création du message.', ephemeral: true });
        }
    },
};
