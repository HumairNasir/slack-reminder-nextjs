import { createClient } from "./server";

export async function getUser() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  // Get user profile from public.users
  const { data: profile } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();

  return { ...user, profile };
}

export async function getUserRole() {
  const user = await getUser();
  return user?.profile?.role || null;
}
