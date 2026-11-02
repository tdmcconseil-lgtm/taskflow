// Route de diagnostic : renvoie le commit déployé (et quelques infos runtime).
// Permet de vérifier l'alignement sans navigateur, ex. :
//   curl https://getrida.com/version
// BUILD_SHA est injecté dans l'image au déploiement (voir Dockerfile + deploy.sh).
export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({
    sha: process.env.BUILD_SHA ?? "dev",
    node: process.version,
    now: new Date().toISOString(),
  });
}
