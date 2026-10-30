import type { Dictionary } from "./fr";

// Dictionnaire ESPAGNOL. Doit couvrir toutes les clés de `fr` (vérifié par le type).
const es: Dictionary = {
  common: {
    appName: "Taskflow",
    language: "Idioma",
  },
  auth: {
    loginSubtitle: "Inicia sesión en tu espacio",
    signupSubtitle: "Crea tu cuenta",
    firstName: "Nombre",
    lastName: "Apellido",
    optional: "(opcional)",
    email: "Correo electrónico",
    password: "Contraseña",
    passwordHint: "8 caracteres mínimo.",
    signIn: "Iniciar sesión",
    createAccount: "Crear mi cuenta",
    noAccount: "¿Aún no tienes cuenta?",
    signUp: "Registrarse",
    haveAccount: "¿Ya tienes una cuenta?",
  },
  nav: {
    home: "Inicio",
    discussions: "Discusiones",
    events: "Eventos",
    logout: "Cerrar sesión",
  },
  wsTabs: {
    projects: "Proyectos",
    members: "Miembros",
    followed: "Mis tareas seguidas",
    events: "Eventos",
    discussions: "Discusiones",
  },
  taskTabs: {
    subtasks: "Subtareas",
    conversation: "Conversación",
    decisions: "Decisiones",
    documents: "Documentos",
    subscribers: "Suscriptores",
    activity: "Actividad",
  },
};

export default es;
