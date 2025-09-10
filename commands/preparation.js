const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../config/config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('preparation')
        .setDescription('Informer sur le statut de la commande'),
    async execute(interaction) {
        try {
            await interaction.deferReply();

            const roleMention = `<@&${config.discord.roles.delivery}>`;

            const embed = new EmbedBuilder()
                .setColor('#000000')
                .setTitle('Statut de commande 🚚')
                .setDescription(`**En cours de préparation ...**\n\nVotre commande est prise en compte, nous revenons vers vous lorsque celle-ci sera prête.\n\n*Cordialement, La Logistique ✂️*`)
                .setFooter({ text: 'Secrétaire du O\'Sheas Barbers - Développé par Nathan Pablosco ❤️', iconURL: interaction.client.user.displayAvatarURL() });

            await interaction.editReply({
                content: roleMention,
                allowedMentions: { parse: ['roles'] },
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
