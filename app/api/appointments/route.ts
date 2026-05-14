import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import {
    createSupabaseServerClient,
    getStaffContext,
} from "@/lib/supabase-server";

export async function GET() {
    const { supabase: serverSupabase, role } = await getStaffContext();

    if (role !== "doctor" && role !== "admin") {
        return NextResponse.json(
            { error: "Unauthorized access." },
            { status: 401 }
        );
    }

    const { data, error } = await serverSupabase
        .from("appointments")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ appointments: data });
}

export async function POST(req: Request) {
    const serverSupabase = await createSupabaseServerClient();
    const {
        data: { user },
    } = await serverSupabase.auth.getUser();
    const body = await req.json();

    const { name, phone, date, department, symptoms, urgency } = body;

    if (!name || !phone || !date || !department) {
        return NextResponse.json(
            { error: "Missing required appointment fields." },
            { status: 400 }
        );
    }

    // Use the service-role (admin) client for the insert so it bypasses RLS.
    // Appointment booking is intentionally public — both anonymous visitors and
    // logged-in patients should be able to book without hitting RLS restrictions.
    const admin = getSupabaseAdminClient();

    if (!admin) {
        return NextResponse.json(
            { error: "Server configuration error." },
            { status: 500 }
        );
    }

    const { data, error } = await admin
        .from("appointments")
        .insert({
            patient_name: name,
            phone,
            appointment_date: date,
            department,
            symptoms: symptoms || null,
            urgency: urgency || "Medium",
            status: "Pending",
            patient_user_id: user?.id ?? null,
            patient_email: user?.email ?? body.patientEmail ?? null,
        })
        .select()
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ appointment: data });
}
