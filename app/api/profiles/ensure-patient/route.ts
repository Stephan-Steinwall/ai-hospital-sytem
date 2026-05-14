import { NextResponse } from "next/server";
import { normalizeAppRole } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function POST() {
    const supabase = await createSupabaseServerClient();
    const {
        data: { user },
        error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
        return NextResponse.json(
            { error: "You must be signed in to recover a profile." },
            { status: 401 }
        );
    }

    const admin = getSupabaseAdminClient();

    if (!admin) {
        return NextResponse.json(
            { error: "Missing SUPABASE_SERVICE_ROLE_KEY in .env.local" },
            { status: 500 }
        );
    }

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

    const { data: existing, error: selectError } = await profilesTable
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

    if (selectError) {
        return NextResponse.json({ error: selectError.message }, { status: 500 });
    }

    if (existing) {
        const role = normalizeAppRole(existing.role);

        if (role) {
            return NextResponse.json({ role, created: false });
        }

        return NextResponse.json(
            { error: "Profile exists but role is not recognized." },
            { status: 409 }
        );
    }

    const { data: inserted, error: insertError } = await profilesTable
        .insert({ id: user.id, role: "patient" })
        .select("role")
        .single();

    if (insertError) {
        const { data: raceProfile, error: raceError } = await profilesTable
            .select("role")
            .eq("id", user.id)
            .maybeSingle();

        if (raceError) {
            return NextResponse.json({ error: raceError.message }, { status: 500 });
        }

        if (raceProfile) {
            const role = normalizeAppRole(raceProfile.role) ?? "patient";
            return NextResponse.json({ role, created: false });
        }

        return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    const role = normalizeAppRole(inserted?.role) ?? "patient";
    return NextResponse.json({ role, created: true });
}
