import { NextResponse } from "next/server";
import { getStaffContext } from "@/lib/supabase-server";

export async function GET() {
    const { supabase, role } = await getStaffContext();

    if (role !== "admin") {
        return NextResponse.json(
            { error: "Unauthorized access." },
            { status: 401 }
        );
    }

    const { data, error } = await supabase
        .from("chat_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ chatLogs: data ?? [] });
}
