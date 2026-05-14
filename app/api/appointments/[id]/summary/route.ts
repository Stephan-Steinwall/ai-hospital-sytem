import { NextResponse } from "next/server";
import { generatePatientSummary } from "@/lib/ai-features";
import { getUserContext } from "@/lib/supabase-server";

export async function POST(
    _req: Request,
    ctx: RouteContext<"/api/appointments/[id]/summary">
) {
    const { id } = await ctx.params;
    const { supabase, role, user } = await getUserContext();

    if (!user || (role !== "doctor" && role !== "admin")) {
        return NextResponse.json(
            { error: "Unauthorized access." },
            { status: 401 }
        );
    }

    const { data: appointment, error: appointmentError } = await supabase
        .from("appointments")
        .select("id, symptoms, urgency, department, appointment_date")
        .eq("id", id)
        .single();

    if (appointmentError || !appointment) {
        return NextResponse.json(
            { error: appointmentError?.message || "Appointment not found." },
            { status: 404 }
        );
    }

    const summary = await generatePatientSummary({
        symptoms: appointment.symptoms,
        urgency: appointment.urgency,
        department: appointment.department,
        appointmentDate: appointment.appointment_date,
    });

    const { data: updatedAppointment, error: updateError } = await supabase
        .from("appointments")
        .update({ ai_patient_summary: summary })
        .eq("id", id)
        .select("*")
        .single();

    if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
        appointment: updatedAppointment,
        summary,
    });
}
