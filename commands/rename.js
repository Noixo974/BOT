const { SlashCommandBuilder } = require('discord.js');
const { safeReply } = require('../utils/interactionHandler');
const Logger = require('../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('renommer')
        .setDescription('Renomme le salon où la commande est exécutée')
        .addStringOption(option =>
            option.setName('nouveau_nom')
                .setDescription('Le nouveau nom du salon')
                .setRequired(true)),
                
    async execute(interaction) {
        try {
            await interaction.deferReply({ ephemeral: true });
            
            const nouveauNom = interaction.options.getString('nouveau_nom');
            const salon = interaction.channel;

            if (!salon) {
                return await interaction.editReply({ 
                    content: 'Le salon n\'est pas défini.',
                    ephemeral: true 
                });
            }

            const guild = interaction.guild;
            if (!guild) {
                return await interaction.editReply({ 
                    content: 'Le serveur n\'est pas défini.',
                    ephemeral: true 
                });
            }

            const botMember = guild.members.me;
            if (!botMember) {
                return await interaction.editReply({ 
                    content: 'Le bot n\'est pas membre du serveur.',
                    ephemeral: true 
                });
            }

            if (!botMember.permissions.has('ManageChannels')) {
                return await interaction.editReply({ 
                    content: 'Je n\'ai pas la permission de gérer les salons.',
                    ephemeral: true 
                });
            }

            if (!salon.permissionsFor(botMember).has('ManageChannels')) {
                return await interaction.editReply({ 
                    content: 'Je n\'ai pas la permission de gérer ce salon.',
                    ephemeral: true 
                });
            }

            if (nouveauNom.length > 100) {
                return await interaction.editReply({ 
                    content: 'Le nouveau nom du salon est trop long. Veuillez entrer un nom de moins de 100 caractères.',
                    ephemeral: true 
                });
            }

            await salon.setName(nouveauNom);
            await interaction.editReply({ 
                content: `Le salon a été renommé en "${nouveauNom}".`,
                ephemeral: true 
            });
            
            Logger.log(`Salon ${salon.id} renommé en "${nouveauNom}" par ${interaction.user.tag}`, 'Rename');
        } catch (error) {
            Logger.error('Erreur lors du renommage du salon:', error);
            await safeReply(interaction, { 
                content: 'Une erreur est survenue lors du renommage du salon.',
                ephemeral: true 
            });
        }
    },
};