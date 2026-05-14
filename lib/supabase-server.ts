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

    if (role) {
        return { supabase, user, role };
    }

    if (error || profileMissing) {
        try {
            const { getSupabaseAdminClient } = await import("@/lib/supabase-admin");
            const admin = getSupabaseAdminClient();

            if (admin) {
                const profilesTable = admin.from("profiles") as unknown as {
                    select: (query: string) => {
                        eq: (column: string, value: string) => {
                            maybeSingle: () => Promise<{
                                data: { role: unknown } | null;
                                error: { message: string } | null;
                            }>;
                        };
                    };
                    insert: (value: { id: string; role: "patient" }) => {
                        select: (query: string) => {
                            single: () => Promise<{
                                data: { role: unknown } | null;
                                error: { message: string } | null;
                            }>;
                        };
                    };
                };

                const { data: adminProfile } = await profilesTable
                    .select("role")
                    .eq("id", user.id)
                    .maybeSingle();

                const adminRole = normalizeAppRole(adminProfile?.role);

                if (adminRole) {
                    return { supabase, user, role: adminRole };
                }

                if (!adminProfile) {
                    await profilesTable
                        .insert({ id: user.id, role: "patient" })
                        .select("role")
                        .single();

                    return { supabase, user, role: "patient" as AppRole };
                }
            }
        } catch {
            // Admin fallback failed; route handlers can decide whether to reject.
        }
    }

    return { supabase, user, role: null as AppRole | null };
}
