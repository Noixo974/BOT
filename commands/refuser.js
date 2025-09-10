const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
require('dotenv').config();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rcandid')
        .setDescription('Informer sur le statut de la candidature en cours : Refusée'),
    async execute(interaction) {
        try {
            await interaction.deferReply();

            const embed = new EmbedBuilder()
                .setColor('#000000')
                .setTitle('Statut de votre candidature : Refusée ❌')
                .setDescription(`**Voici la décision du conseil de recrutement**\n\nNous avons le regret de vous annoncer que votre candidature n'a pas été retenue.\n\nMerci pour l'intérêt que vous portez au O'Sheas Barbers.`)
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
