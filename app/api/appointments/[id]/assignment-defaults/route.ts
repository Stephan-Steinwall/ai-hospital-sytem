import { NextResponse } from "next/server";
import {
    buildAssignmentDefaults,
    type AppointmentAssignmentDefaults,
} from "@/lib/appointment-assignment";
import { getUserContext } from "@/lib/supabase-server";

type AssignmentAppointmentRow = {
    id: string;
    appointment_date: string;
    department: string;
    assigned_doctor: string | null;
    room_number: string | null;
    appointment_number: string | null;
    queue_number: number | null;
    current_queue_number: number | null;
    appointment_time: string | null;
};

export async function GET(
    _req: Request,
    ctx: RouteContext<"/api/appointments/[id]/assignment-defaults">
) {
    const { id } = await ctx.params;
    const { supabase, role, user } = await getUserContext();

    if (!user || role !== "admin") {
        return NextResponse.json(
            { error: "Unauthorized access." },
            { status: 401 }
        );
    }

    const appointmentsTable = supabase.from("appointments") as unknown as {
        select: (query: string) => {
            eq: (column: string, value: string) => {
                single: () => Promise<{
                    data: AssignmentAppointmentRow | null;
                    error: { message: string } | null;
                }>;
            };
        };
    };

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

    const doctorName = appointment.assigned_doctor?.trim() || undefined;
    const queryDoctor = doctorName ?? buildAssignmentDefaults(appointment, []).assignedDoctor;

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

    const { data: doctorSchedule, error: scheduleError } = await doctorScheduleTable
        .select(
            "id, appointment_date, assigned_doctor, queue_number, current_queue_number"
        )
        .eq("appointment_date", appointment.appointment_date)
        .eq("assigned_doctor", queryDoctor)
        .order("queue_number", { ascending: false });

    if (scheduleError) {
        return NextResponse.json({ error: scheduleError.message }, { status: 500 });
    }

    const defaults = buildAssignmentDefaults(
        appointment,
        doctorSchedule ?? []
    ) satisfies AppointmentAssignmentDefaults;

    return NextResponse.json({ defaults });
}
