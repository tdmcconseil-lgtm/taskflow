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
};

export type Dictionary = typeof fr;
export default fr;
