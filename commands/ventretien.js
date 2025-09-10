const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../config/config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ventretien')
        .setDescription('Informer sur le statut de l\'entretien en cours : Acceptée')
        .addUserOption(option =>
            option.setName('candidat')
                .setDescription('Le candidat à qui attribuer le rôle')
                .setRequired(true)),
    async execute(interaction) {
        try {
            await interaction.deferReply();

            const candidat = interaction.options.getUser('candidat');
            const member = await interaction.guild.members.fetch(candidat.id);
            
            if (!member) {
                return await interaction.editReply({
                    content: 'L\'utilisateur spécifié n\'est pas membre de ce serveur.',
                    ephemeral: true
                });
            }

            // Ajouter le rôle au candidat
            const role = await interaction.guild.roles.fetch(config.discord.roles.entretienCandidate);
            if (!role) {
                return await interaction.editReply({
                    content: 'Le rôle spécifié n\'existe pas sur ce serveur.',
                    ephemeral: true
                });
            }

            await member.roles.add(role);

            // Vérifier et retirer le rôle spécifié s'il l'a
            const roleToRemove = await interaction.guild.roles.fetch(config.discord.roles.oldCandidate);
            if (roleToRemove && member.roles.cache.has(config.discord.roles.oldCandidate)) {
                await member.roles.remove(roleToRemove);
                console.log(`Rôle ${roleToRemove.name} retiré de ${candidat.tag}`);
            }

            // Sauvegarder les permissions actuelles du salon
            const currentPermissions = interaction.channel.permissionOverwrites.cache.map(perm => ({
                id: perm.id,
                type: perm.type,
                allow: perm.allow,
                deny: perm.deny
            }));

            // Déplacer le salon vers la nouvelle catégorie
            await interaction.channel.setParent(config.discord.categories.entretienAccepted);

            // Restaurer les permissions sauvegardées
            await interaction.channel.permissionOverwrites.set(currentPermissions);

            const embed = new EmbedBuilder()
                .setColor('#000000')
                .setTitle('Statut de votre entretien : Acceptée ✅')
                .setDescription(`**Candidature acceptée**\n\n${candidat}, nous avons le plaisir de vous annoncer que votre entretien oral à été valider !\n\nPour poursuivre les démarches, veuillez patienter pour une formation dans le salon : "📅・𝓕𝓸𝓻𝓶𝓪𝓽𝓲𝓸𝓷".`)
                .setFooter({ text: 'Secrétaire du O\'Sheas Barbers - Développé par Nathan Pablosco ❤️', iconURL: interaction.client.user.displayAvatarURL() });

            await interaction.editReply({
                embeds: [embed],
                ephemeral: false
            });

            console.log(`Message envoyé pour ${candidat.tag} - Rôle attribué:`, embed.description);
        } catch (error) {
            console.error('Erreur lors de la création du message:', error);
            await interaction.editReply({ content: 'Une erreur est survenue lors de la création du message.', ephemeral: true });
        }
    },
};