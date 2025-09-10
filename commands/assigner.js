const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('assigner')
        .setDescription('Assigner une personne au ticket')
        .addUserOption(option =>
            option.setName('personne')
                .setDescription('La personne à assigner au ticket')
                .setRequired(true)),

    async execute(interaction) {
        try {
            const personne = interaction.options.getUser('personne');
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

            const embed = new EmbedBuilder()
                .setTitle('✅・Assignation')
                .setColor('#00FF00') // Couleur verte
                .setDescription(`${personne} a été assigné au ticket par ${assigneur}`)
                .setFooter({ 
                    text: 'Secrétaire du O\'Sheas Barbers - Développé par Nathan Pablosco ❤️', 
                    iconURL: interaction.client.user.displayAvatarURL() 
                });

            await interaction.reply({
                content: `${personne}`, // Mention de la personne assignée
                embeds: [embed],
                allowedMentions: { parse: ['users'] }
            });

            console.log(`${personne.tag} a été assigné au ticket par ${assigneur.tag}`);
        } catch (error) {
            console.error('Erreur lors de l\'assignation:', error);
            await interaction.reply({
                content: 'Une erreur est survenue lors de l\'assignation.',
                ephemeral: true
            });
        }
    },
};