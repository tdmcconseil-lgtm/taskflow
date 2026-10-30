import type { Dictionary } from "./fr";

// Dictionnaire ANGLAIS. Doit couvrir toutes les clés de `fr` (vérifié par le type).
const en: Dictionary = {
  common: {
    appName: "Taskflow",
    language: "Language",
  },
  auth: {
    loginSubtitle: "Sign in to your workspace",
    signupSubtitle: "Create your account",
    firstName: "First name",
    lastName: "Last name",
    optional: "(optional)",
    email: "Email",
    password: "Password",
    passwordHint: "8 characters minimum.",
    signIn: "Sign in",
    createAccount: "Create my account",
    noAccount: "No account yet?",
    signUp: "Sign up",
    haveAccount: "Already have an account?",
  },
  nav: {
    home: "Home",
    discussions: "Discussions",
    events: "Events",
    logout: "Log out",
  },
  wsTabs: {
    projects: "Projects",
    members: "Members",
    followed: "My followed tasks",
    events: "Events",
    discussions: "Discussions",
  },
  taskTabs: {
    subtasks: "Subtasks",
    conversation: "Conversation",
    decisions: "Decisions",
    documents: "Documents",
    subscribers: "Subscribers",
    activity: "Activity",
  },
};

export default en;
