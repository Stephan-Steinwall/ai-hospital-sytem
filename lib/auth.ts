import type { SupabaseClient, User } from "@supabase/supabase-js";

export type AppRole = "patient" | "doctor" | "admin";

export function normalizeAppRole(role: unknown): AppRole | null {
    if (role === "patient" || role === "doctor" || role === "admin") {
        return role;
    }

    return null;
}

export async function loadUserRole(
    supabase: SupabaseClient,
    user: Pick<User, "id">
) {
    const { data: profile, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

    if (error) {
        return {
            role: null,
            error,
            profileMissing: false,
        };
    }

    const normalizedRole = normalizeAppRole(profile?.role);

    if (normalizedRole) {
        return {
            role: normalizedRole,
            error: null,
            profileMissing: false,
        };
    }

    return {
        role: null,
        error: null,
        profileMissing: !profile,
    };
}
