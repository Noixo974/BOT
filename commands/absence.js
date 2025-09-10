const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const moment = require('moment');
const AbsenceService = require('../services/absenceService');
const Logger = require('../utils/logger');

moment.locale('fr');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('absence')
        .setDescription('Signaler une absence')
        .addIntegerOption(option =>
            option.setName('jours')
                .setDescription('Nombre de jours d\'absence')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('delai')
                .setDescription('Nombre de jours avant le début de l\'absence')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('raison')
                .setDescription('Raison de l\'absence')
                .setRequired(true)),

    async execute(interaction) {
        try {
            const jours = interaction.options.getInteger('jours');
            const delai = interaction.options.getInteger('delai');
            const raison = interaction.options.getString('raison');
            const userId = interaction.user.id;
            const guildId = interaction.guild.id;

            // Calculer les dates
            const maintenant = moment();
            const debutDate = maintenant.clone().add(delai, 'days').startOf('day');
            const finDate = debutDate.clone().add(jours - 1, 'days').endOf('day');

            // Créer l'embed
            const embed = new EmbedBuilder()
                .setColor('#000000')
                .setTitle('🔕・Absence')
                .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
                .addFields(
                    { name: ' ', value: `**🙎・Absence signalée par :** <@${userId}>`, inline: false },
                    { name: '✈️・Début :', value: debutDate.format('DD/MM/YYYY'), inline: true },
                    { name: '🛬・Fin :', value: finDate.format('DD/MM/YYYY'), inline: true },
                    { name: '⏲️・Durée :', value: `${jours} jour${jours > 1 ? 's' : ''}`, inline: true },
                    { name: '📜・Raison :', value: raison, inline: false }
                )
                .setFooter({ text: 'Secrétaire du O\'Sheas Barbers - Développé par Nathan Pablosco ❤️', iconURL: interaction.client.user.displayAvatarURL() });

            // Enregistrer l'absence
            await AbsenceService.createAbsence(userId, debutDate, finDate, raison, guildId);

            // Planifier la gestion des rôles
            await AbsenceService.scheduleRoleManagement(
                interaction.client,
                userId,
                guildId,
                debutDate,
                finDate
            );

            await interaction.reply({ embeds: [embed] });
            Logger.log('Message d\'absence envoyé avec succès.', 'Absence');

        } catch (error) {
            Logger.error(`Erreur lors de l'exécution de la commande absence: ${error}`, 'Absence');
            await interaction.reply({
                content: 'Une erreur est survenue lors de l\'envoi du message d\'absence.',
                ephemeral: true
            });
        }
    },

    // Utiliser une fonction fléchée pour maintenir le contexte
    reloadAbsences: async (client) => {
        return AbsenceService.reloadAbsences(client);
    }
};