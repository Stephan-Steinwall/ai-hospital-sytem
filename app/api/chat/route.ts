import { NextResponse } from "next/server";
import { generateLocalizedHealthResponse } from "@/lib/ai-features";
import { getEducationalDisclaimer, resolveLanguage } from "@/lib/languages";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { lookupTrustedMedicalInfo } from "@/lib/medical-search";

const redFlagTerms = [
    "severe chest pain",
    "difficulty breathing",
    "fainting",
    "unconscious",
    "stroke",
    "heavy bleeding",
    "suicidal",
    "seizure",
    "can't breathe",
    "cannot breathe",
];

function detectUrgency(message: string) {
    const lower = message.toLowerCase();
    return redFlagTerms.some((term) => lower.includes(term));
}

function suggestDepartment(message: string) {
    const lower = message.toLowerCase();

    if (
        lower.includes("chest") ||
        lower.includes("heart") ||
        lower.includes("palpitation") ||
        lower.includes("blood pressure")
    ) {
        return {
            department: "Cardiology",
            consultant: "Dr. Nimal Perera",
        };
    }

    if (
        lower.includes("cough") ||
        lower.includes("asthma") ||
        lower.includes("breath") ||
        lower.includes("lung")
    ) {
        return {
            department: "Respiratory Medicine",
            consultant: "Dr. Ayesha Fernando",
        };
    }

    if (
        lower.includes("headache") ||
        lower.includes("dizzy") ||
        lower.includes("dizziness") ||
        lower.includes("seizure") ||
        lower.includes("numb")
    ) {
        return {
            department: "Neurology",
            consultant: "Dr. Kavindu Silva",
        };
    }

    if (
        lower.includes("stomach") ||
        lower.includes("vomit") ||
        lower.includes("diarrhea") ||
        lower.includes("diarrhoea") ||
        lower.includes("nausea") ||
        lower.includes("abdomen")
    ) {
        return {
            department: "Gastroenterology",
            consultant: "Dr. Malini Jayawardena",
        };
    }

    return {
        department: "General Medicine",
        consultant: "Dr. Sahan Wijesinghe",
    };
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const message = body.message as string;
        const language = resolveLanguage(body.language);

        if (!message || typeof message !== "string") {
            return NextResponse.json(
                { error: "Message is required." },
                { status: 400 }
            );
        }

        const urgent = detectUrgency(message);
        const recommendation = suggestDepartment(message);
        const trustedInfo = await lookupTrustedMedicalInfo(message);
        const localizedResponse = await generateLocalizedHealthResponse({
            prompt: message,
            language,
            urgent,
            department: recommendation.department,
            consultant: recommendation.consultant,
            trustedInfo: trustedInfo.map((item) => ({
                source: item.source,
                title: item.title,
            })),
        });

        const admin = getSupabaseAdminClient();
        if (admin) {
            const { error: chatLogError } = await admin.from("chat_logs").insert({
                user_message: message,
                assistant_reply: localizedResponse.reply,
                urgency: urgent ? "High" : "Medium",
                suggested_department: recommendation.department,
            });

            if (chatLogError) {
                console.error("Chat log save error:", chatLogError);
            }
        }

        return NextResponse.json({
            reply: localizedResponse.reply,
            urgent,
            recommendation,
            trustedInfo,
            bookingPrompt: localizedResponse.bookingPrompt,
            disclaimer:
                localizedResponse.disclaimer ?? getEducationalDisclaimer(language),
        });
    } catch (error) {
        console.error("Chat API error:", error);

        return NextResponse.json(
            {
                error: "Failed to generate AI response.",
            },
            { status: 500 }
        );
    }
}
