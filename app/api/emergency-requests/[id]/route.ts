import { NextResponse } from "next/server";
import { getStaffContext } from "@/lib/supabase-server";

const ALLOWED_STATUSES = new Set([
    "Requested",
    "Dispatched",
    "Resolved",
    "Cancelled",
]);

export async function PATCH(
    req: Request,
    ctx: RouteContext<"/api/emergency-requests/[id]">
) {
    const { id } = await ctx.params;
    const { supabase, role } = await getStaffContext();

    if (role !== "doctor" && role !== "admin") {
        return NextResponse.json(
            { error: "Unauthorized access." },
            { status: 401 }
        );
    }

    const body = await req.json();

    if (typeof body.status !== "string" || !ALLOWED_STATUSES.has(body.status)) {
        return NextResponse.json(
            { error: "Invalid emergency request status." },
            { status: 400 }
        );
    }

    const { data, error } = await supabase
        .from("emergency_requests")
        .update({ status: body.status })
        .eq("id", id)
        .select("*")
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ request: data });
}
