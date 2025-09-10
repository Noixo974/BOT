const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('assignerforma')
        .setDescription('Assigner une personne à la formation de candidats')
        .addUserOption(option =>
            option.setName('personne')
                .setDescription('La personne qui prendra en charge la formation')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('candidats')
                .setDescription('Les candidats (séparez par des virgules, ex: @user1, @user2)')
                .setRequired(true)),

    async execute(interaction) {
        try {
            const personne = interaction.options.getUser('personne');
            const candidatsString = interaction.options.getString('candidats');
            const assigneur = interaction.user;

            // Ajouter la personne au salon si elle n'y a pas accès
            try {
                const member = await interaction.guild.members.fetch(personne.id);
                const canViewChannel = interaction.channel.permissionsFor(member).has('ViewChannel');
                
                if (!canViewChannel) {
                    await interaction.channel.permissionOverwrites.edit(member, {
                        ViewChannel: true,
                        SendMessages: true,
                        ReadMessageHistory: true
                    });
                    console.log(`${personne.tag} ajouté au salon ${interaction.channel.name}`);
                }
            } catch (error) {
                console.error('Erreur lors de l\'ajout de la personne au salon:', error);
            }

            // Traiter la chaîne des candidats pour extraire les mentions
            const candidatMentions = candidatsString.match(/<@!?(\d+)>/g) || [];
            const candidatsList = [];
            const mentionsList = [];

            for (const mention of candidatMentions) {
                const userId = mention.match(/\d+/)[0];
                try {
                    const user = await interaction.client.users.fetch(userId);
                    candidatsList.push(`- ${user}`);
                    mentionsList.push(user.toString());
                } catch (error) {
                    console.error(`Impossible de récupérer l'utilisateur ${userId}:`, error);
                }
            }

            // Si aucune mention valide n'a été trouvée, traiter comme du texte simple
            if (candidatsList.length === 0) {
                const candidatsArray = candidatsString.split(',').map(c => c.trim());
                candidatsArray.forEach(candidat => {
                    candidatsList.push(`- ${candidat}`);
                });
            }

            const embed = new EmbedBuilder()
                .setTitle('🔴・Formation')
                .setColor('#FF0000') // Couleur rouge
                .setDescription(`${personne} prendra en charge la formation de :\n${candidatsList.join('\n')}`)
                .setFooter({ 
                    text: 'Secrétaire du O\'Sheas Barbers - Développé par Nathan Pablosco ❤️', 
                    iconURL: interaction.client.user.displayAvatarURL() 
                });

            // Créer le contenu avec les mentions
            let content = `${personne}`;
            if (mentionsList.length > 0) {
                content += ` ${mentionsList.join(' ')}`;
            }

            await interaction.reply({
                content: content,
                embeds: [embed],
                allowedMentions: { parse: ['users'] }
            });

            console.log(`${personne.tag} a été assigné à la formation par ${assigneur.tag}`);
        } catch (error) {
            console.error('Erreur lors de l\'assignation de formation:', error);
            await interaction.reply({
                content: 'Une erreur est survenue lors de l\'assignation de formation.',
                ephemeral: true
            });
        }
    },
};