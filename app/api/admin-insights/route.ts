import { NextResponse } from "next/server";
import { generateAdminInsights } from "@/lib/ai-features";
import { getUserContext } from "@/lib/supabase-server";

export async function GET() {
    const { supabase, user, role } = await getUserContext();

    if (!user || role !== "admin") {
        return NextResponse.json(
            { error: "Unauthorized access." },
            { status: 401 }
        );
    }

    const [appointmentsResult, emergencyResult, chatLogsResult] = await Promise.all([
        supabase
            .from("appointments")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(30),
        supabase
            .from("emergency_requests")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(20),
        supabase
            .from("chat_logs")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(20),
    ]);

    if (appointmentsResult.error || emergencyResult.error || chatLogsResult.error) {
        return NextResponse.json(
            {
                error:
                    appointmentsResult.error?.message ||
                    emergencyResult.error?.message ||
                    chatLogsResult.error?.message ||
                    "Failed to load admin insight data.",
            },
            { status: 500 }
        );
    }

    const cards = await generateAdminInsights({
        appointments: appointmentsResult.data ?? [],
        emergencyRequests: emergencyResult.data ?? [],
        chatLogs: chatLogsResult.data ?? [],
    });

    return NextResponse.json({
        cards,
        generatedAt: new Date().toISOString(),
    });
}
