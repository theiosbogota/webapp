import { createClient } from "@/lib/supabase/client";

export async function loginAction(formData: FormData) {
  const supabase = createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const redirectParam = (formData.get("redirect") as string) || "";

  if (!email || !password) {
    return { error: "Email y contraseña son requeridos" };
  }

  const { data: authData, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  // If a specific redirect was requested (e.g. middleware sent us to /auth/login
  // because they tried to access a protected page), honor it.
  if (redirectParam && redirectParam.startsWith("/") && !redirectParam.startsWith("//")) {
    window.location.href = redirectParam;
    return {};
  }

  // Otherwise route by role: admins → /admin, everyone else → /dashboard
  let target = "/dashboard";
  if (authData.user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", authData.user.id)
      .single();
    if (profile?.role === "admin") target = "/admin";
  }

  window.location.href = target;
  return {};
}

export async function registerAction(formData: FormData) {
  const supabase = createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirm-password") as string;
  const fullName = formData.get("name") as string;
  const phone = formData.get("phone") as string;

  if (!email || !password || !fullName) {
    return { error: "Nombre, email y contraseña son requeridos" };
  }

  if (password !== confirmPassword) {
    return { error: "Las contraseñas no coinciden" };
  }

  if (password.length < 8) {
    return { error: "La contraseña debe tener al menos 8 caracteres" };
  }

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        phone: phone || null,
      },
    },
  });

  if (error) {
    return { error: error.message };
  }

  window.location.href = "/?registered=true";
  return {};
}

export async function logoutAction() {
  const supabase = createClient();
  await supabase.auth.signOut();
  window.location.href = "/";
}

export async function loginWithGoogleAction() {
  const supabase = createClient();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/auth/callback`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  if (data.url) {
    window.location.href = data.url;
  }
  return {};
}
