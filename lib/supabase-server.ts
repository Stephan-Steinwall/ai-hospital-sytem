import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { loadUserRole, normalizeAppRole, type AppRole } from "@/lib/auth";

export async function createSupabaseServerClient() {
    const cookieStore = await cookies();

    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll();
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) => {
                        cookieStore.set(name, value, options);
                    });
                },
            },
        }
    );
}

export async function getStaffContext() {
    const userContext = await getUserContext();

    return {
        supabase: userContext.supabase,
        user: userContext.user,
        role:
            userContext.role === "doctor" || userContext.role === "admin"
                ? userContext.role
                : null,
    };
}

export async function getUserContext() {
    const supabase = await createSupabaseServerClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return { supabase, user: null, role: null as AppRole | null };
    }

    const { role, error, profileMissing } = await loadUserRole(supabase, user);

    // Happy path: role is known from the profiles table.
    if (role) {
        return { supabase, user, role };
    }

    // If the anon-key profiles query failed or the row is missing, fall back to
    // the admin (service-role) client which bypasses RLS entirely.
    if (error || profileMissing) {
        try {
            const { getSupabaseAdminClient } = await import("@/lib/supabase-admin");
            const admin = getSupabaseAdminClient();

            if (admin) {
                const { data: adminProfile } = await admin
                    .from("profiles")
                    .select("role")
                    .eq("id", user.id)
                    .maybeSingle();

                const adminRole = normalizeAppRole(adminProfile?.role);

                if (adminRole) {
                    return { supabase, user, role: adminRole };
                }

                // Profile row is completely missing — create a default patient row.
                if (!adminProfile) {
                    await admin
                        .from("profiles")
                        .insert({ id: user.id, role: "patient" })
                        .select("role")
                        .single();

                    return { supabase, user, role: "patient" as AppRole };
                }
            }
        } catch {
            // Admin fallback failed — return null role so route handlers can
            // decide whether to reject or serve a degraded response.
        }
    }

    return { supabase, user, role: null as AppRole | null };
}
