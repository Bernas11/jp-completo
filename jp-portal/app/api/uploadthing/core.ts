import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getOrCreateProfile } from "@/lib/profile";
import { isModeratorRole } from "@/lib/roles";

const f = createUploadthing();

async function requireModerator() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new UploadThingError("Não autenticado.");

  const profile = await getOrCreateProfile(supabase, user);
  if (!profile || !isModeratorRole(profile.role)) {
    throw new UploadThingError("Apenas moderadores podem publicar ficheiros.");
  }

  return { profileId: profile.id };
}

export const ourFileRouter = {
  // Documentos (portal_documents) — PDFs, folhetos, atas, etc.
  documentUploader: f({ blob: { maxFileSize: "16MB", maxFileCount: 1 } })
    .middleware(requireModerator)
    .onUploadComplete(async ({ metadata, file }) => {
      console.log(`Documento enviado por ${metadata.profileId}: ${file.ufsUrl}`);
    }),

  // Arquivo de Congressos (archive_congress_items) — fotos, atas, resoluções.
  archiveUploader: f({ blob: { maxFileSize: "32MB", maxFileCount: 1 } })
    .middleware(requireModerator)
    .onUploadComplete(async ({ metadata, file }) => {
      console.log(`Ficheiro de arquivo enviado por ${metadata.profileId}: ${file.ufsUrl}`);
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
