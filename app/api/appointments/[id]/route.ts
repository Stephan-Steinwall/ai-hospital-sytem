import { NextResponse } from "next/server";
import { getUserContext } from "@/lib/supabase-server";

const ALLOWED_STATUSES = new Set([
    "Pending",
    "Approved",
    "In Progress",
    "Completed",
    "Rejected",
    "Cancelled",
]);

export async function PATCH(
    req: Request,
    ctx: RouteContext<"/api/appointments/[id]">
) {
    const { id } = await ctx.params;
    const { supabase, role, user } = await getUserContext();

    if (!user) {
        return NextResponse.json(
            { error: "Unauthorized access." },
            { status: 401 }
        );
    }

    const body = await req.json();

    if (role === "patient") {
        const patientUpdates: Record<string, string | number | null> = {};

        if (typeof body.feedbackRating === "number") {
            patientUpdates.feedback_rating = body.feedbackRating;
        }

        if (typeof body.feedbackComment === "string") {
            patientUpdates.feedback_comment = body.feedbackComment.trim();
        }

        if (!Object.keys(patientUpdates).length) {
            return NextResponse.json(
                { error: "No valid patient update was provided." },
                { status: 400 }
            );
        }

        const { data, error } = await supabase
            .from("appointments")
            .update(patientUpdates)
            .eq("id", id)
            .eq("patient_user_id", user.id)
            .select("*")
            .single();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ appointment: data });
    }

    if (role !== "doctor" && role !== "admin") {
        return NextResponse.json(
            { error: "Unauthorized access." },
            { status: 401 }
        );
    }

    const updates: Record<string, string | number | null> = {};

    if (typeof body.status === "string") {
        if (!ALLOWED_STATUSES.has(body.status)) {
            return NextResponse.json(
                { error: "Invalid appointment status." },
                { status: 400 }
            );
        }

        updates.status = body.status;

        if (body.status === "Completed") {
            updates.completed_at = new Date().toISOString();
        }
    }

    const stringFields: Record<string, string> = {
        appointmentNumber: "appointment_number",
        assignedDoctor: "assigned_doctor",
        roomNumber: "room_number",
        appointmentTime: "appointment_time",
        followUpDate: "follow_up_date",
        publicPatientNotes: "public_patient_notes",
        internalStaffNotes: "internal_staff_notes",
    };

    Object.entries(stringFields).forEach(([bodyKey, dbKey]) => {
        if (typeof body[bodyKey] === "string") {
            updates[dbKey] = body[bodyKey].trim() || null;
        }
    });

    if (typeof body.queueNumber === "number") {
        updates.queue_number = body.queueNumber;
    }

    if (typeof body.currentQueueNumber === "number") {
        updates.current_queue_number = body.currentQueueNumber;
    }

    if (!Object.keys(updates).length) {
        return NextResponse.json(
            { error: "No valid appointment updates were provided." },
            { status: 400 }
        );
    }

    const { data, error } = await supabase
        .from("appointments")
        .update(updates)
        .eq("id", id)
        .select("*")
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ appointment: data });
}
