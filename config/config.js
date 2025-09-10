require('dotenv').config();

module.exports = {
  // Discord Configuration
  discord: {
    roles: {
      // Utilisé dans commands/role.js - Rôle pour les notifications d'ouverture/fermeture
      notification: '1268156918535295017',
      
      // Utilisé dans commands/livraison.js et ticket.js - Rôle staff pour les permissions
      staff: ['1268156918535295017','1268156918535295017'],
      
      // Utilisé dans ticket.js et ticketC.js - Rôle administrateur
      admin: '1268156918535295017',
      
      // Utilisé dans commands/preparation.js, commands/prete.js, commands/paye.js - Rôle pour les notifications de livraison
      delivery: '1268156918535295017',
      
      // Utilisé dans commands/livraison.js - Rôle pour les notifications de livraison
      deliveryNotification: '1268156918535295017',
        
      // Rôles pour les cartes cadeaux
      giftcard: {
        create: ['1268156918535295017','1268156918535295017','1268156918535295017','1268156918535295017','1268156918535295017'], // Rôles pour créer une carte cadeau
        modify: ['1268156918535295017','1268156918535295017','1268156918535295017','1268156918535295017','1268156918535295017'], // Rôles pour modifier une carte cadeau
        view: ['1268156918535295017'],   // Rôles pour voir toutes les cartes
        delete: ['1268156918535295017','1268156918535295017','1268156918535295017','1268156918535295017','1268156918535295017']  // Rôles pour supprimer une carte cadeau
      },
      
      // Rôles pour les candidatures
      candidate: '1268156918535295017',
      entretienCandidate: '1268156918535295017',
      oldCandidate: '1268156918535295017',
      
      // Rôle d'absence
      absence: '1268156918535295017'
    },
    
    channels: {
      // Utilisé dans ouvert.js - Salon où les annonces de livraison sont affichées
      deliveryAnnouncements: '1341099197524476088',
      
      // Utilisé dans ouvert.js - Salon où les messages de statut de livraison sont envoyés
      deliveryDestination: '1309775733190557707',
      
      // Utilisé dans ticket.js - Salon où les tickets sont créés
      tickets: '1309775668191690752',
      
      // Utilisé dans ticketC.js - Salon où les tickets de candidature sont créés
      ticketsC: '1309775668191690752',
      
      // Utilisé dans commands/giftcard.js - Salon pour les logs des cartes cadeaux
      giftCardLogs: '1309775668191690752',
      
      // Salon pour les archives de tickets fermés
      ticketArchives: '1309775668191690752'
    },
    
    categories: {
      // Catégories pour les tickets standards
      ticketSupport: '1279698623571038229',
      ticketBilling: '1279698623571038229',
      ticketOther: '1279698623571038229',
      
      // Catégorie pour les tickets de candidature
      ticketCandidature: '1279698623571038229',
      
      // Catégorie pour les tickets archivés
      ticketArchived: '1309757862381355028',
      
      // Catégories pour les candidatures acceptées
      candidatureAccepted: '1279698623571038229',
      entretienAccepted: '1279698623571038229'
    },
    
    authorizedUsers: {
      // Utilisateurs autorisés à utiliser la commande clear
      clearCommand: ["1268156918535295017", "1268156918535295017"]
    }
  },

  // Database Configuration
  database: {
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE
  },

  // Bot Configuration
  bot: {
    footer: ' Secrétaire O\'Sheas Barbers - Développé par Nathan Pablosco ❤️'
  },
  
  // Couleurs
  colors: {
    primary: '#000000',
    success: '#00ff00',
    error: '#ff0000'
  }
};