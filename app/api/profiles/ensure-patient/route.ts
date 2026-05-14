import { NextResponse } from "next/server";
import { normalizeAppRole } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function POST() {
    // Verify the caller is authenticated using the cookie-based server client.
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

    // Use the admin (service-role) client to bypass RLS.
    const admin = getSupabaseAdminClient();

    if (!admin) {
        return NextResponse.json(
            { error: "Server configuration error: SUPABASE_SERVICE_ROLE_KEY is missing." },
            { status: 500 }
        );
    }

    // Check whether the profile row already exists.
    const { data: existing, error: selectError } = await admin
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

    if (selectError) {
        console.error("[ensure-patient] select error:", selectError);
        return NextResponse.json({ error: selectError.message }, { status: 500 });
    }

    if (existing) {
        const role = normalizeAppRole(existing.role);

        if (role) {
            return NextResponse.json({ role, created: false });
        }

        // Profile exists but role is invalid — return it anyway so the client
        // can surface a meaningful message rather than getting a non-OK status.
        return NextResponse.json(
            { error: "Profile exists but role is not recognized.", role: existing.role },
            { status: 409 }
        );
    }

    // Profile row is missing — insert a default patient profile.
    const { data: inserted, error: insertError } = await admin
        .from("profiles")
        .insert({ id: user.id, role: "patient" })
        .select("role")
        .single();

    if (insertError) {
        // A concurrent request may have inserted the row already (race). Retry.
        const { data: raceProfile, error: raceError } = await admin
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .maybeSingle();

        if (raceError) {
            console.error("[ensure-patient] race-check error:", raceError);
            return NextResponse.json({ error: raceError.message }, { status: 500 });
        }

        if (raceProfile) {
            const role = normalizeAppRole(raceProfile.role) ?? "patient";
            return NextResponse.json({ role, created: false });
        }

        console.error("[ensure-patient] insert error:", insertError);
        return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    const role = normalizeAppRole(inserted?.role) ?? "patient";
    return NextResponse.json({ role, created: true });
}
