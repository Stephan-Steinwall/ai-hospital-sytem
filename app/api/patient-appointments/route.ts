import { NextResponse } from "next/server";
import { getUserContext } from "@/lib/supabase-server";

export async function GET() {
    const { supabase, user, role } = await getUserContext();

    if (!user) {
        return NextResponse.json(
            { error: "Please log in to view your appointments." },
            { status: 401 }
        );
    }

    if (role !== "patient") {
        return NextResponse.json(
            { error: "Patient portal access is restricted to patient accounts." },
            { status: 403 }
        );
    }

    const { data, error } = await supabase
        .from("appointments")
        .select("*")
        .eq("patient_user_id", user.id)
        .order("appointment_date", { ascending: true });

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ appointments: data ?? [] });
}
