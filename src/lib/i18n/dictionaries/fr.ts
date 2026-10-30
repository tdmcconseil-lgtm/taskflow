// Dictionnaire FRANÇAIS — source de référence. La forme de cet objet définit le
// type `Dictionary` : les autres langues (en, es) doivent fournir les mêmes clés.
const fr = {
  common: {
    appName: "Taskflow",
    language: "Langue",
  },
  auth: {
    loginSubtitle: "Connectez-vous à votre espace",
    signupSubtitle: "Créez votre compte",
    firstName: "Prénom",
    lastName: "Nom",
    optional: "(facultatif)",
    email: "Email",
    password: "Mot de passe",
    passwordHint: "8 caractères minimum.",
    signIn: "Se connecter",
    createAccount: "Créer mon compte",
    noAccount: "Pas encore de compte ?",
    signUp: "S'inscrire",
    haveAccount: "Déjà un compte ?",
  },
  nav: {
    home: "Accueil",
    discussions: "Discussions",
    events: "Événements",
    logout: "Déconnexion",
  },
  wsTabs: {
    projects: "Projets",
    members: "Membres",
    followed: "Mes tâches suivies",
    events: "Événements",
    discussions: "Discussions",
  },
  taskTabs: {
    subtasks: "Sous-tâches",
    conversation: "Conversation",
    decisions: "Décisions",
    documents: "Documents",
    subscribers: "Abonnés",
    activity: "Activité",
  },
};

export type Dictionary = typeof fr;
export default fr;
