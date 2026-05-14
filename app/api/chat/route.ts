import { NextResponse } from "next/server";
import OpenAI from "openai";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { lookupTrustedMedicalInfo } from "@/lib/medical-search";

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

const SYSTEM_PROMPT = `
You are Suwa Assist, an AI healthcare assistant for Suwa Setha Hospital.

Rules:
- Do NOT diagnose diseases.
- Do NOT prescribe medication.
- Do NOT claim certainty about a condition.
- Provide general health education only.
- Recommend consulting a qualified healthcare professional.
- If red-flag symptoms appear, advise urgent medical care.
- Keep responses clear, calm, short, and patient-friendly.
- You may suggest a relevant hospital department or consultant type.
- Always include a safety reminder when discussing symptoms.

Response style:
- Use simple language.
- Maximum 120 words.
- Do not mention that you are using OpenAI.
`;

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

        if (!message || typeof message !== "string") {
            return NextResponse.json(
                { error: "Message is required." },
                { status: 400 }
            );
        }

        const urgent = detectUrgency(message);
        const recommendation = suggestDepartment(message);
        const trustedInfo = await lookupTrustedMedicalInfo(message);

        const completion = await openai.chat.completions.create({
            model: "gpt-4.1-mini",
            temperature: 0.3,
            messages: [
                {
                    role: "system",
                    content: SYSTEM_PROMPT,
                },
                {
                    role: "user",
                    content: `
Patient message:
${message}

Detected urgency:
${urgent ? "High urgency / red flag possible" : "No obvious red flag detected"}

Suggested department:
${recommendation.department}

Suggested consultant:
${recommendation.consultant}

Trusted medical topics found:
${trustedInfo.map((item) => `${item.source}: ${item.title}`).join("\n") || "None"}

Write a safe patient-facing response with:
1. A short safety response.
2. A reminder this is not a diagnosis.
3. A suggestion to book an appointment with the recommended department.
`,
                },
            ],
        });

        const reply =
            completion.choices[0]?.message?.content?.trim() ||
            "I can provide general guidance, but please consult a healthcare professional for proper medical advice.";

        // Use the admin client so the chat_log insert bypasses RLS.
        // Saving chat logs is an internal operation — it should never fail
        // because of RLS policies.
        const admin = getSupabaseAdminClient();
        if (admin) {
            const { error: chatLogError } = await admin.from("chat_logs").insert({
                user_message: message,
                assistant_reply: reply,
                urgency: urgent ? "High" : "Medium",
                suggested_department: recommendation.department,
            });

            if (chatLogError) {
                console.error("Chat log save error:", chatLogError);
            }
        }

        return NextResponse.json({
            reply,
            urgent,
            recommendation,
            trustedInfo,
            bookingPrompt:
                "You can continue to the appointment section to request a consultation.",
            disclaimer:
                "This information is educational and not a medical diagnosis.",
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
