import { NextResponse } from "next/server";
import {
    buildAssignmentDefaults,
    buildAppointmentNumber,
    buildSuggestedAppointmentTime,
    inferAssignedDoctor,
    inferRoomNumber,
} from "@/lib/appointment-assignment";
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
    const appointmentsTable = supabase.from("appointments") as unknown as {
        select: (query: string) => {
            eq: (column: string, value: string) => {
                single: () => Promise<{
                    data: {
                        id: string;
                        appointment_date: string;
                        department: string;
                        assigned_doctor: string | null;
                        room_number: string | null;
                        appointment_number: string | null;
                        queue_number: number | null;
                        current_queue_number: number | null;
                        appointment_time: string | null;
                    } | null;
                    error: { message: string } | null;
                }>;
                eq?: never;
            };
            order?: never;
        };
        update: (value: Record<string, string | number | null>) => {
            eq: (column: string, value: string) => {
                eq: (column: string, value: string) => {
                    select: (query: string) => {
                        single: () => Promise<{
                            data: unknown;
                            error: { message: string } | null;
                        }>;
                    };
                };
                select: (query: string) => {
                    single: () => Promise<{
                        data: unknown;
                        error: { message: string } | null;
                    }>;
                };
            };
        };
    };

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

        const { data, error } = await appointmentsTable
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
    let shouldGenerateAssignmentDefaults = false;

    if (typeof body.status === "string") {
        if (!ALLOWED_STATUSES.has(body.status)) {
            return NextResponse.json(
                { error: "Invalid appointment status." },
                { status: 400 }
            );
        }

        updates.status = body.status;
        shouldGenerateAssignmentDefaults =
            role === "admin" && body.status === "Approved";

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

    if (role === "admin" && shouldGenerateAssignmentDefaults) {
        const { data: appointment, error: appointmentError } = await appointmentsTable
            .select(
                "id, appointment_date, department, assigned_doctor, room_number, appointment_number, queue_number, current_queue_number, appointment_time"
            )
            .eq("id", id)
            .single();

        if (appointmentError || !appointment) {
            return NextResponse.json(
                { error: appointmentError?.message || "Appointment not found." },
                { status: 404 }
            );
        }

        const assignedDoctor =
            typeof updates.assigned_doctor === "string"
                ? updates.assigned_doctor
                : appointment.assigned_doctor;
        const fallbackDoctor =
            assignedDoctor?.trim() || inferAssignedDoctor(appointment.department);

        const doctorScheduleTable = supabase.from("appointments") as unknown as {
            select: (query: string) => {
                eq: (column: string, value: string) => {
                    eq: (column: string, value: string) => {
                        order: (
                            column: string,
                            options: { ascending: boolean }
                        ) => Promise<{
                            data: Array<{
                                id: string;
                                appointment_date: string;
                                assigned_doctor: string | null;
                                queue_number: number | null;
                                current_queue_number: number | null;
                            }> | null;
                            error: { message: string } | null;
                        }>;
                    };
                };
            };
        };

        const { data: doctorSchedule, error: scheduleError } =
            await doctorScheduleTable
                .select(
                    "id, appointment_date, assigned_doctor, queue_number, current_queue_number"
                )
                .eq("appointment_date", appointment.appointment_date)
                .eq("assigned_doctor", fallbackDoctor)
                .order("queue_number", { ascending: false });

        if (scheduleError) {
            return NextResponse.json({ error: scheduleError.message }, { status: 500 });
        }

        const computedDefaults = buildAssignmentDefaults(
            {
                ...appointment,
                assigned_doctor:
                    typeof updates.assigned_doctor === "string"
                        ? updates.assigned_doctor
                        : appointment.assigned_doctor,
                room_number:
                    typeof updates.room_number === "string"
                        ? updates.room_number
                        : appointment.room_number,
                appointment_number:
                    typeof updates.appointment_number === "string"
                        ? updates.appointment_number
                        : appointment.appointment_number,
                queue_number:
                    typeof updates.queue_number === "number"
                        ? updates.queue_number
                        : appointment.queue_number,
                current_queue_number:
                    typeof updates.current_queue_number === "number"
                        ? updates.current_queue_number
                        : appointment.current_queue_number,
                appointment_time:
                    typeof updates.appointment_time === "string"
                        ? updates.appointment_time
                        : appointment.appointment_time,
            },
            doctorSchedule ?? []
        );

        if (!updates.assigned_doctor) {
            updates.assigned_doctor = computedDefaults.assignedDoctor;
        }

        if (!updates.room_number) {
            updates.room_number =
                appointment.room_number?.trim() ||
                inferRoomNumber(appointment.department) ||
                computedDefaults.roomNumber;
        }

        if (updates.queue_number === undefined) {
            updates.queue_number = computedDefaults.queueNumber;
        }

        if (!updates.appointment_number) {
            updates.appointment_number = buildAppointmentNumber(
                appointment.appointment_date,
                (updates.assigned_doctor as string) || computedDefaults.assignedDoctor,
                updates.queue_number as number
            );
        }

        if (!updates.appointment_time) {
            updates.appointment_time = buildSuggestedAppointmentTime(
                updates.queue_number as number
            );
        }

        if (updates.current_queue_number === undefined) {
            updates.current_queue_number = computedDefaults.currentQueueNumber;
        }
    }

    if (!Object.keys(updates).length) {
        return NextResponse.json(
            { error: "No valid appointment updates were provided." },
            { status: 400 }
        );
    }

    const { data, error } = await appointmentsTable
        .update(updates)
        .eq("id", id)
        .select("*")
        .single();

    if (error) {
        if (
            error.message.includes("appointments_doctor_date_queue_unique_idx") ||
            error.message.toLowerCase().includes("duplicate key")
        ) {
            return NextResponse.json(
                {
                    error:
                        "Another appointment already received that queue number. Please regenerate defaults and try again.",
                },
                { status: 409 }
            );
        }

        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ appointment: data });
}
