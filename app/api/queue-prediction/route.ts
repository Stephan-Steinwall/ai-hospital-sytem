import { NextResponse } from "next/server";
import { resolveLanguage } from "@/lib/languages";
import { buildQueuePrediction } from "@/lib/queue-prediction";

interface QueuePredictionRequestBody {
    language?: string;
    appointments?: Array<{
        id: string;
        appointment_date: string;
        appointment_time?: string | null;
        queue_number?: number | null;
        current_queue_number?: number | null;
        department: string;
        status: string;
    }>;
}

export async function POST(req: Request) {
    const body = (await req.json()) as QueuePredictionRequestBody;
    const language = resolveLanguage(body.language);
    const appointments = Array.isArray(body.appointments) ? body.appointments : [];

    const predictions = Object.fromEntries(
        appointments.map((appointment) => [
            appointment.id,
            buildQueuePrediction(appointment, language),
        ])
    );

    return NextResponse.json({ predictions });
}
