"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export interface AuthResponse {
  success: boolean;
  error?: string;
  message?: string;
}

/**
 * Sign In with email & password using Supabase Auth.
 * Includes support for demo credentials when testing locally.
 */
export async function signIn(formData: {
  email: string;
  password: string;
  rememberMe?: boolean;
}): Promise<AuthResponse> {
  const email = formData.email.trim();
  const password = formData.password;

  if (!email || !password) {
    return { success: false, error: "Please enter both email and password." };
  }

  // Check for Demo Analyst Credentials fallback
  if (
    email.toLowerCase() === "demo.analyst@fbsearch.io" &&
    password === "demoPassword123!"
  ) {
    const cookieStore = await cookies();
    cookieStore.set("fb_demo_session", "true", {
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });
    cookieStore.set(
      "fb_user_info",
      JSON.stringify({
        email: "demo.analyst@fbsearch.io",
        fullName: "Demo Analyst",
        organization: "Vertex Media Intelligence",
      }),
      {
        path: "/",
        httpOnly: false,
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 24 * 7,
      }
    );

    revalidatePath("/", "layout");
    return { success: true, message: "Demo analyst session initiated." };
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    if (data.user) {
      // Clear demo cookie if real user signed in
      const cookieStore = await cookies();
      cookieStore.delete("fb_demo_session");
      cookieStore.delete("fb_user_info");

      revalidatePath("/", "layout");
      return { success: true };
    }

    return { success: false, error: "Authentication failed. Please try again." };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "An unexpected error occurred.";
    return { success: false, error: message };
  }
}

/**
 * Register a new user with Supabase Auth.
 * Creates an entry in auth.users and profile metadata.
 */
export async function signUp(formData: {
  email: string;
  password: string;
  fullName: string;
  organization: string;
}): Promise<AuthResponse> {
  const email = formData.email.trim();
  const password = formData.password;
  const fullName = formData.fullName.trim();
  const organization = formData.organization.trim();

  if (!email || !password || !fullName) {
    return { success: false, error: "All required fields must be filled." };
  }

  if (password.length < 8) {
    return {
      success: false,
      error: "Password must be at least 8 characters long.",
    };
  }

  try {
    const supabase = await createClient();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${siteUrl}/auth/callback`,
        data: {
          full_name: fullName,
          organization: organization || "Independent Analyst",
        },
      },
    });

    if (error) {
      return { success: false, error: error.message };
    }

    // If confirmation is disabled, user is immediately signed in
    if (data.session) {
      revalidatePath("/", "layout");
      return {
        success: true,
        message: "Account created successfully.",
      };
    }

    // Email confirmation required
    return {
      success: true,
      message:
        "Registration successful! Please check your email to confirm your account.",
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create account.";
    return { success: false, error: message };
  }
}

/**
 * Sign out user from Supabase and clear session cookies.
 */
export async function signOut(): Promise<void> {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
  } catch {
    // Ignore errors during signOut if client is offline
  }

  const cookieStore = await cookies();
  cookieStore.delete("fb_demo_session");
  cookieStore.delete("fb_user_info");

  revalidatePath("/", "layout");
  redirect("/login");
}

/**
 * Request password reset email from Supabase Auth.
 */
export async function requestPasswordReset(email: string): Promise<AuthResponse> {
  if (!email) {
    return { success: false, error: "Please enter your email address." };
  }

  try {
    const supabase = await createClient();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${siteUrl}/auth/callback?next=/reset-password`,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      message: "Password reset link sent! Please check your email inbox.",
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to send reset link.";
    return { success: false, error: message };
  }
}

/**
 * Update authenticated user's password.
 */
export async function updatePassword(newPassword: string): Promise<AuthResponse> {
  if (!newPassword || newPassword.length < 8) {
    return {
      success: false,
      error: "New password must be at least 8 characters long.",
    };
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      message: "Your password has been updated successfully.",
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update password.";
    return { success: false, error: message };
  }
}

/**
 * Update authenticated user's profile information.
 */
export async function updateUserProfile(updates: {
  fullName?: string;
  organization?: string;
  timezone?: string;
}): Promise<AuthResponse> {
  const cookieStore = await cookies();
  const isDemo = cookieStore.get("fb_demo_session")?.value === "true";

  if (isDemo) {
    const infoRaw = cookieStore.get("fb_user_info")?.value;
    const current = infoRaw ? JSON.parse(infoRaw) : {};
    cookieStore.set(
      "fb_user_info",
      JSON.stringify({
        ...current,
        fullName: updates.fullName || current.fullName,
        organization: updates.organization || current.organization,
      }),
      {
        path: "/",
        httpOnly: false,
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 24 * 7,
      }
    );
    revalidatePath("/settings/account");
    return { success: true, message: "Demo profile updated." };
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: "User is not authenticated." };
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: updates.fullName,
        organization: updates.organization,
        timezone: updates.timezone,
      })
      .eq("id", user.id);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/settings/account");
    return { success: true, message: "Profile updated successfully." };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update profile.";
    return { success: false, error: message };
  }
}

/**
 * Retrieve the current authenticated user and profile information.
 */
export async function getCurrentUser() {
  try {
    const cookieStore = await cookies();
    const isDemo = cookieStore.get("fb_demo_session")?.value === "true";

    if (isDemo) {
      const infoRaw = cookieStore.get("fb_user_info")?.value;
      const parsed = infoRaw ? JSON.parse(infoRaw) : null;
      return {
        id: "demo-user-uuid",
        email: parsed?.email || "demo.analyst@fbsearch.io",
        fullName: parsed?.fullName || "Demo Analyst",
        organization: parsed?.organization || "Vertex Media Intelligence",
        role: "analyst",
        isDemo: true,
      };
    }

    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) return null;

    // Fetch user profile from public.profiles
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    return {
      id: user.id,
      email: user.email,
      fullName: profile?.full_name || user.user_metadata?.full_name || user.email,
      organization:
        profile?.organization ||
        user.user_metadata?.organization ||
        "Independent Analyst",
      role: profile?.role || "analyst",
      avatarUrl: profile?.avatar_url || null,
      isDemo: false,
    };
  } catch {
    return null;
  }
}
