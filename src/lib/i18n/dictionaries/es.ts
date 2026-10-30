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
};

export default es;
