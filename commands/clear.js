const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const config = require('../config/config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('clear')
        .setDescription('Supprime tous les messages du salon')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

    async execute(interaction) {
        try {
            // Vérifier si l'utilisateur est autorisé
            if (!config.discord.authorizedUsers.clearCommand.includes(interaction.user.id)) {
                return await interaction.reply({
                    content: "❌ Vous n'avez pas la permission d'utiliser cette commande.",
                    ephemeral: true
                });
            }

            // Vérifier les permissions du bot
            if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ManageMessages)) {
                return await interaction.reply({
                    content: "❌ Je n'ai pas la permission de supprimer les messages.",
                    ephemeral: true
                });
            }

            // Différer la réponse immédiatement
            await interaction.deferReply({ ephemeral: true });

            // Récupérer tous les messages du salon
            const messages = await interaction.channel.messages.fetch();

            // Filtrer les messages pour exclure ceux de plus de 14 jours
            const deletableMessages = messages.filter(message => {
                return message.deletable && (Date.now() - message.createdTimestamp <= 1209600000); // 14 jours en ms
            });

            // Supprimer tous les messages filtrés
            if (deletableMessages.size > 0) {
                await interaction.channel.bulkDelete(deletableMessages, true)
                    .catch(error => {
                        console.error('Erreur lors de la suppression des messages:', error);
                        throw error;
                    });
            }

            // Supprimer individuellement les messages plus anciens que 14 jours
            for (const message of messages.values()) {
                if (message.createdTimestamp <= Date.now() - 1209600000 && message.deletable) {
                    try {
                        await message.delete();
                    } catch (error) {
                        console.error(`Impossible de supprimer le message avec ID ${message.id}:`, error);
                    }
                }
            }

            // Répondre une fois la tâche terminée
            await interaction.editReply({
                content: `✅ Les messages ont été supprimés avec succès.`,
            });

        } catch (error) {
            console.error('Erreur lors de l\'exécution de la commande clear:', error);

            // Répondre en cas d'erreur
            if (!interaction.replied) {
                const errorMessage = error.code === 50034 
                    ? "❌ Impossible de supprimer les messages de plus de 14 jours."
                    : "❌ Une erreur est survenue lors de la suppression des messages.";
                await interaction.editReply({
                    content: errorMessage,
                }).catch(console.error);
            }
        }
    }
};
