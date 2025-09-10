const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ajouter')
        .setDescription('Ajoute un utilisateur au salon courant')
        .addUserOption(option =>
            option.setName('utilisateur')
                .setDescription('L\'utilisateur à ajouter au salon')
                .setRequired(true)),
    async execute(interaction) {
        try {
            const utilisateur = interaction.options.getUser('utilisateur');
            const salon = interaction.channel;

            if (!salon) {
                await interaction.reply({ content: 'Le salon n\'est pas défini.', ephemeral: true });
                return;
            }

            const guild = interaction.guild;
            if (!guild) {
                await interaction.reply({ content: 'Le serveur n\'est pas défini.', ephemeral: true });
                return;
            }

            const memberToAdd = guild.members.cache.get(utilisateur.id);
            if (!memberToAdd) {
                await interaction.reply({ content: 'L\'utilisateur n\'est pas membre du serveur.', ephemeral: true });
                return;
            }

            const botMember = guild.members.me;
            if (!botMember) {
                await interaction.reply({ content: 'Le bot n\'est pas membre du serveur.', ephemeral: true });
                return;
            }

            if (!botMember.permissions.has(PermissionFlagsBits.ManageChannels)) {
                await interaction.reply({ content: 'Je n\'ai pas la permission de gérer les salons.', ephemeral: true });
                return;
            }

            // Vérifier les permissions pour le salon spécifique
            if (!salon.permissionsFor(botMember).has(PermissionFlagsBits.ManageChannels)) {
                await interaction.reply({ content: 'Je n\'ai pas la permission de gérer ce salon.', ephemeral: true });
                return;
            }

            // Ajouter l'utilisateur aux permissions du salon
            await salon.permissionOverwrites.edit(memberToAdd, {
                [PermissionFlagsBits.ViewChannel]: true,  // Permet de voir le canal
                [PermissionFlagsBits.SendMessages]: true  // Permet d'envoyer des messages dans le canal
            });

            await interaction.reply({ content: `${utilisateur.tag} a été ajouté au salon.`, ephemeral: true });
            console.log(`${utilisateur.tag} ajouté au salon ${salon.name}`);
        } catch (error) {
            console.error('Erreur lors de l\'ajout de l\'utilisateur au salon:', error);
            await interaction.reply({ content: 'Une erreur est survenue lors de l\'ajout de l\'utilisateur au salon.', ephemeral: true });
        }
    },
};
