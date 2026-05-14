import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { getStaffContext } from "@/lib/supabase-server";

export async function GET() {
    const { supabase: serverSupabase, role } = await getStaffContext();

    if (role !== "doctor" && role !== "admin") {
        return NextResponse.json(
            { error: "Unauthorized access." },
            { status: 401 }
        );
    }

    const { data, error } = await serverSupabase
        .from("emergency_requests")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ requests: data ?? [] });
}

export async function POST(req: Request) {
    const body = await req.json();
    const { patientName, phone, latitude, longitude, notes } = body;

    if (typeof latitude !== "number" || typeof longitude !== "number") {
        return NextResponse.json(
            { error: "Location is required for emergency requests." },
            { status: 400 }
        );
    }

    // Use the service-role (admin) client so the insert bypasses RLS.
    // Emergency requests are intentionally public — anyone (anon or signed-in)
    // should be able to submit one without a session cookie.
    const admin = getSupabaseAdminClient();

    if (!admin) {
        return NextResponse.json(
            { error: "Server configuration error." },
            { status: 500 }
        );
    }

    const emergencyRequestsTable = admin.from(
        "emergency_requests"
    ) as unknown as {
        insert: (value: {
            patient_name: string | null;
            phone: string | null;
            latitude: number;
            longitude: number;
            notes: string | null;
            status: string;
        }) => {
            select: (query: string) => {
                single: () => Promise<{
                    data: unknown;
                    error: { message: string } | null;
                }>;
            };
        };
    };

    const { data, error } = await emergencyRequestsTable
        .insert({
            patient_name: patientName || null,
            phone: phone || null,
            latitude,
            longitude,
            notes: notes || null,
            status: "Requested",
        })
        .select("*")
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ request: data });
}
