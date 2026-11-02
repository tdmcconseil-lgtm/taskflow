-- Un « Document » peut désormais être un fichier téléversé (FILE) ou un lien externe (LINK).
CREATE TYPE "DocumentKind" AS ENUM ('FILE', 'LINK');

ALTER TABLE "Document" ADD COLUMN "kind" "DocumentKind" NOT NULL DEFAULT 'FILE';
ALTER TABLE "Document" ADD COLUMN "url" TEXT;

-- Les champs propres au fichier deviennent facultatifs (null pour un lien).
ALTER TABLE "Document" ALTER COLUMN "fileName" DROP NOT NULL;
ALTER TABLE "Document" ALTER COLUMN "mime" DROP NOT NULL;
ALTER TABLE "Document" ALTER COLUMN "size" DROP NOT NULL;
ALTER TABLE "Document" ALTER COLUMN "data" DROP NOT NULL;
