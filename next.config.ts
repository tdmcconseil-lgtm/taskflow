import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Les Server Actions plafonnent le corps de requête à 1 Mo par défaut, ce qui
  // rejetait tout upload > 1 Mo AVANT d'atteindre le garde-fou applicatif
  // (MAX_SIZE = 10 Mo). On relève la borne transport à 12 Mo : 10 Mo utiles +
  // la marge de l'encodage multipart (frontières, en-têtes de parties, champs).
  experimental: {
    serverActions: {
      bodySizeLimit: "12mb",
    },
  },
};

export default nextConfig;
