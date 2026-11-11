import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

export type AppProfile = {
  id: string;
  email: string;
  phone: string;
  display_name: string;
};

export async function getSessionUser(): Promise<User | null> {
  const sb = createClient();
  const { data } = await sb.auth.getUser();
  return data.user ?? null;
}

export async function ensureProfile(user: User): Promise<AppProfile> {
  const sb = createClient();
  const phone = (user.user_metadata?.phone as string) || "";
  const display =
    (user.user_metadata?.display_name as string) ||
    (user.email ? user.email.split("@")[0] : "Friend");

  const { data: existing } = await sb
    .from("app_profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (existing) {
    return existing as AppProfile;
  }

  const row = {
    id: user.id,
    email: user.email || "",
    phone,
    display_name: display,
  };
  const { data, error } = await sb
    .from("app_profiles")
    .upsert(row, { onConflict: "id" })
    .select("*")
    .single();
  if (error) throw error;
  return data as AppProfile;
}

export async function updateProfile(patch: {
  display_name?: string;
  phone?: string;
}) {
  const user = await getSessionUser();
  if (!user) throw new Error("Not signed in");
  const sb = createClient();
  const { data, error } = await sb
    .from("app_profiles")
    .update({
      ...patch,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id)
    .select("*")
    .single();
  if (error) throw error;
  return data as AppProfile;
}

export async function signOut() {
  const sb = createClient();
  await sb.auth.signOut();
}
