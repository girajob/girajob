import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** Uploads to the private media bucket under the user's folder; returns storage path. */
export async function uploadMedia(userId: string, file: File, prefix: string) {
  if (!file.type.startsWith("image/")) throw new Error("Envie uma imagem");
  if (file.size > 8 * 1024 * 1024) throw new Error("Imagem maior que 8 MB");
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${userId}/${prefix}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("media").upload(path, file, { upsert: true });
  if (error) throw error;
  return path;
}

/** Temporary signed URL for a stored media path. */
export function useMediaUrl(path: string | null | undefined) {
  return useQuery({
    queryKey: ["media", path],
    enabled: !!path,
    staleTime: 50 * 60 * 1000,
    queryFn: async () => {
      if (path!.startsWith("http")) return path!;
      const { data, error } = await supabase.storage.from("media").createSignedUrl(path!, 3600);
      if (error) throw error;
      return data.signedUrl;
    },
  }).data;
}
