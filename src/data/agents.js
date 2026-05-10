// ============================================
// Agents Configuration
// Modifiez N8N_WEBHOOK_URL pour chaque agent
// ============================================

export const N8N_BASE_URL = import.meta.env.VITE_N8N_BASE_URL || 'http://localhost:5678'

export const AGENTS = {
  calendar: {
    id: 'calendar',
    name: 'Calendrier',
    fullName: 'Agent Calendrier',
    description: 'Connecté à Google Calendar',
    icon: 'Calendar',
    color: '#6C47FF',
    status: 'online',
    webhookPath: '/webhook/central-router',
    greeting: 'Bonjour ! Je gère votre calendrier. Je peux planifier des réunions, vérifier vos disponibilités et créer des événements. Comment puis-je vous aider ?',
    capabilities: ['Créer des événements', 'Vérifier disponibilités', 'Envoyer des invitations', 'Rappels automatiques'],
    acceptedFiles: [],
    sampleReplies: [
      '✅ Réunion créée ! **Équipe — Demain 10h00–11h00**. Invitations envoyées à 4 membres. Le lien Meet a été ajouté automatiquement.',
      '📅 J\'ai vérifié les disponibilités. Tous les membres sont libres demain entre 10h et 12h.',
      '🔄 Workflow n8n déclenché : 3 événements synchronisés avec votre calendrier.',
      '⏰ Rappel configuré pour dans 30 minutes avant la réunion. Notification envoyée par email et SMS.'
    ]
  },
  email: {
    id: 'email',
    name: 'Email',
    fullName: 'Agent Email',
    description: 'Connecté à Gmail',
    icon: 'Mail',
    color: '#0EA5E9',
    status: 'online',
    webhookPath: '/webhook/central-router',
    greeting: 'Bonjour ! Je traite vos emails intelligemment. Voulez-vous un résumé des messages urgents, une réponse automatique, ou un tri de votre boîte de réception ?',
    capabilities: ['Résumé des emails', 'Réponse automatique', 'Tri et filtrage', 'Suivi de threads'],
    acceptedFiles: [],
    sampleReplies: [
      '📬 J\'ai trouvé **3 emails urgents** dans votre boîte. Deux nécessitent une réponse avant 17h. Voulez-vous que je rédige les réponses ?',
      '✉️ Réponse automatique envoyée à vos 5 contacts. Ton professionnel utilisé, délai de réponse : 2 minutes.',
      '🏷️ **47 emails triés** : 12 urgents, 23 informatifs, 8 newsletters archivées, 4 spam supprimés.',
      '📊 Rapport hebdomadaire : 234 emails reçus, 89% traités automatiquement, temps économisé : ~3h.'
    ]
  },
  meet: {
    id: 'meet',
    name: 'Réunions',
    fullName: 'Agent Réunions',
    description: 'Google Meet · En attente',
    icon: 'Video',
    color: '#10B981',
    status: 'idle',
    webhookPath: '/webhook/central-router',
    greeting: 'Je gère vos réunions de A à Z. Transcription en temps réel, résumé automatique, extraction des points d\'action — que souhaitez-vous ?',
    capabilities: ['Transcription live', 'Résumé automatique', 'Points d\'action', 'Compte-rendu PDF'],
    acceptedFiles: ['audio/*', 'video/*'],
    sampleReplies: [
      '🎥 Lien Meet créé et envoyé aux **6 participants**. Agenda joint, salle de conférence réservée.',
      '📝 Transcription terminée (97% de précision). **5 points d\'action** identifiés et assignés à l\'équipe.',
      '📊 Résumé de la réunion généré : durée 45min, 8 participants, 3 décisions prises, prochain RDV fixé.',
      '🔔 Compte-rendu PDF envoyé par email à tous les participants. Tâches créées dans Notion.'
    ]
  },
  tasks: {
    id: 'tasks',
    name: 'Tâches',
    fullName: 'Agent Tâches',
    description: 'Notion + Asana connectés',
    icon: 'CheckSquare',
    color: '#F59E0B',
    status: 'online',
    webhookPath: '/webhook/central-router',
    greeting: 'Je crée, assigne et suis vos tâches automatiquement sur Notion et Asana. Qu\'est-ce que vous souhaitez organiser ?',
    capabilities: ['Créer des tâches', 'Assigner à l\'équipe', 'Suivi de progression', 'Rapports d\'avancement'],
    acceptedFiles: ['.pdf', '.doc', '.docx', '.txt'],
    sampleReplies: [
      '✅ **5 tâches créées** dans Notion avec priorités et assignations. Sprint board mis à jour.',
      '🔔 Rappels configurés pour l\'équipe. 3 membres notifiés via Slack.',
      '📋 Tableau Kanban mis à jour : 8 tâches en cours, 3 bloquées, 12 terminées cette semaine.',
      '📈 Rapport de progression : 78% des tâches du sprint complétées. Deadline respectée ✓'
    ]
  },
  docs: {
    id: 'docs',
    name: 'Documents',
    fullName: 'Agent Documents',
    description: 'Google Drive · Analyse IA',
    icon: 'FileText',
    color: '#8B5CF6',
    status: 'online',
    webhookPath: '/webhook/central-router',
    greeting: 'Je peux analyser, résumer et extraire des informations de vos documents. Envoyez-moi un PDF, Word ou texte à traiter.',
    capabilities: ['Analyse de documents', 'Résumé intelligent', 'Extraction de données', 'Traduction'],
    acceptedFiles: ['.pdf', '.doc', '.docx', '.txt', '.csv', '.xlsx'],
    sampleReplies: [
      '📄 Document analysé (**24 pages**). Résumé : 3 sections clés, 7 points importants extraits, 2 actions recommandées.',
      '🔍 Recherche dans vos 847 docs : **12 résultats pertinents** trouvés. Les 3 plus récents affichés.',
      '💾 Document indexé et sauvegardé dans Drive. Catégorie : Contrats Q4 2024.',
      '📊 Extraction de données terminée : 156 entrées exportées vers Google Sheets.'
    ]
  },
  audio: {
    id: 'audio',
    name: 'Audio/Vidéo',
    fullName: 'Agent Audio/Vidéo',
    description: 'Whisper API · Transcription',
    icon: 'Mic',
    color: '#EC4899',
    status: 'offline',
    webhookPath: '/webhook/central-router',
    greeting: 'Je transcris et analyse vos fichiers audio et vidéo. Déposez un enregistrement pour obtenir une transcription précise avec horodatage.',
    capabilities: ['Transcription audio', 'Sous-titres vidéo', 'Résumé vocal', 'Détection de langue'],
    acceptedFiles: ['audio/*', 'video/*', '.mp3', '.mp4', '.wav', '.m4a', '.webm'],
    sampleReplies: [
      '🎙️ Transcription terminée (**98.2% de précision**). Durée : 23min. Langue détectée : Français.',
      '🔊 Fichier audio traité. **4 intervenants** identifiés, texte formaté avec horodatage.',
      '📝 Compte-rendu vocal généré. Points clés extraits et envoyés par email.',
      '🎬 Sous-titres SRT générés pour votre vidéo. Format compatible YouTube/Vimeo.'
    ]
  }
}

export const HISTORY_ITEMS = [
  { id: 1, title: 'Planifier réunion équipe produit', agent: 'calendar', time: 'Aujourd\'hui 14:32', preview: 'Réunion créée pour demain 10h' },
  { id: 2, title: 'Résumé emails urgents du jour', agent: 'email', time: 'Aujourd\'hui 11:05', preview: '3 emails traités, 2 réponses envoyées' },
  { id: 3, title: 'Analyser rapport Q3 2024', agent: 'docs', time: 'Aujourd\'hui 09:20', preview: 'PDF 47 pages — résumé généré' },
  { id: 4, title: 'Transcription réunion client', agent: 'audio', time: 'Hier 17:20', preview: 'Audio 45min — 4 intervenants' },
  { id: 5, title: 'Créer tâches sprint octobre', agent: 'tasks', time: 'Hier 14:10', preview: '12 tâches créées dans Notion' },
  { id: 6, title: 'Compte-rendu stand-up', agent: 'meet', time: 'Hier 09:44', preview: '5 points d\'action extraits' },
  { id: 7, title: 'Trier newsletters et spam', agent: 'email', time: 'Lun 16:30', preview: '67 emails archivés automatiquement' },
  { id: 8, title: 'Synchroniser calendriers équipe', agent: 'calendar', time: 'Lun 10:15', preview: '4 calendriers synchronisés' },
]

export const NOTIFICATIONS = [
  { id: 1, type: 'success', message: 'Workflow Email déclenché avec succès', time: '14:35', read: false },
  { id: 2, type: 'info', message: '3 nouvelles tâches créées dans Notion', time: '14:20', read: false },
  { id: 3, type: 'success', message: 'Transcription audio terminée', time: '13:45', read: false },
  { id: 4, type: 'warning', message: 'Agent Audio/Vidéo hors ligne', time: '12:30', read: true },
  { id: 5, type: 'success', message: 'Rapport hebdomadaire envoyé', time: '09:00', read: true },
]
