import type { Appointment, ChatLog, EmergencyRequest } from "@/types";
import type { AppLanguage } from "@/lib/languages";
import {
    getEducationalDisclaimer,
    getLanguageDisplayName,
    resolveLanguage,
} from "@/lib/languages";
import { getOpenAIClient } from "@/lib/openai-server";

export interface PatientSummaryInput {
    symptoms: string | null;
    urgency: Appointment["urgency"];
    department: string;
    appointmentDate: string;
}

export interface AdminInsightCard {
    title: "Key Insight" | "Risk/Concern" | "Suggested Action";
    content: string;
}

function safeText(value: string | null | undefined, fallback: string) {
    const trimmed = value?.trim();
    return trimmed ? trimmed : fallback;
}

export async function generateLocalizedHealthResponse(args: {
    prompt: string;
    language: AppLanguage;
    urgent: boolean;
    department: string;
    consultant: string;
    trustedInfo: Array<{ source: string; title: string }>;
}) {
    const language = resolveLanguage(args.language);
    const openai = getOpenAIClient();

    if (!openai) {
        return {
            reply:
                "I can share general health guidance, but please consult a qualified healthcare professional for personal medical advice.",
            disclaimer: getEducationalDisclaimer(language),
            bookingPrompt:
                "You can continue to the appointment section to request a consultation.",
        };
    }

    try {
        const completion = await openai.chat.completions.create({
            model: "gpt-4.1-mini",
            temperature: 0.3,
            messages: [
                {
                    role: "system",
                    content: `You are Suwa Assist, an AI healthcare assistant for a hospital. Reply in ${getLanguageDisplayName(
                        language
                    )}. Do not diagnose diseases. Do not prescribe medication. Keep the response calm, clear, and patient-friendly. Maximum 120 words. Include a short safety reminder and state that the information is not a diagnosis.`,
                },
                {
                    role: "user",
                    content: `Patient message:
${args.prompt}

Urgency:
${args.urgent ? "High urgency / red flag possible" : "No obvious red flag detected"}

Suggested department:
${args.department}

Suggested consultant:
${args.consultant}

Trusted topics:
${args.trustedInfo.map((item) => `${item.source}: ${item.title}`).join("\n") || "None"}

Write:
1. A short safe response.
2. A reminder that this is not a diagnosis.
3. A suggestion to book with the recommended department.`,
                },
            ],
        });

        return {
            reply:
                completion.choices[0]?.message?.content?.trim() ??
                "Please consult a qualified healthcare professional for personal medical advice.",
            disclaimer: getEducationalDisclaimer(language),
            bookingPrompt:
                "You can continue to the appointment section to request a consultation.",
        };
    } catch {
        return {
            reply:
                "I can share general health guidance, but please consult a qualified healthcare professional for personal medical advice.",
            disclaimer: getEducationalDisclaimer(language),
            bookingPrompt:
                "You can continue to the appointment section to request a consultation.",
        };
    }
}

export async function localizeMedicalSummary(
    query: string,
    sourceSummary: string,
    language: AppLanguage
) {
    const resolvedLanguage = resolveLanguage(language);
    const openai = getOpenAIClient();

    if (!openai || resolvedLanguage === "en") {
        return sourceSummary;
    }

    try {
        const completion = await openai.chat.completions.create({
            model: "gpt-4.1-mini",
            temperature: 0.2,
            messages: [
                {
                    role: "system",
                    content: `Translate or restate educational medical information into ${getLanguageDisplayName(
                        resolvedLanguage
                    )}. Do not diagnose. Do not prescribe. Keep it to 2-3 sentences.`,
                },
                {
                    role: "user",
                    content: `Topic: ${query}

Educational summary:
${sourceSummary}

Return a patient-friendly version in ${getLanguageDisplayName(
                    resolvedLanguage
                )}.`,
                },
            ],
        });

        return completion.choices[0]?.message?.content?.trim() ?? sourceSummary;
    } catch {
        return sourceSummary;
    }
}

function extractDuration(symptoms: string | null) {
    if (!symptoms) {
        return "Duration not clearly stated.";
    }

    const match = symptoms.match(
        /\b(\d+\s*(day|days|week|weeks|month|months|hour|hours)|today|yesterday|since\s+\w+)\b/i
    );

    return match
        ? `Possible duration mentioned: ${match[0]}.`
        : "Duration not clearly stated.";
}

export async function generatePatientSummary(input: PatientSummaryInput) {
    const symptomText = safeText(
        input.symptoms,
        "The patient did not provide detailed symptom notes."
    );
    const durationLine = extractDuration(input.symptoms);
    const fallback = [
        `Main symptoms: ${symptomText}`,
        durationLine,
        `Urgency level: ${input.urgency}.`,
        `Suggested department: ${input.department}.`,
        "Key concerns: confirm symptom progression, red-flag changes, and impact on daily function.",
        "Recommended questions doctor may ask: When did this start? What makes it better or worse? Are there associated symptoms, prior episodes, or relevant medical history?",
        "This summary is for consultation preparation only and does not provide a diagnosis.",
    ].join(" ");

    const openai = getOpenAIClient();

    if (!openai) {
        return fallback;
    }

    try {
        const completion = await openai.chat.completions.create({
            model: "gpt-4.1-mini",
            temperature: 0.2,
            messages: [
                {
                    role: "system",
                    content:
                        "You create concise doctor-facing pre-consultation summaries. Do not diagnose. Do not prescribe medication. Keep the tone operational and clinical. Limit to 120 words.",
                },
                {
                    role: "user",
                    content: `Create a concise pre-consultation summary for a doctor.

Symptoms:
${symptomText}

Urgency:
${input.urgency}

Suggested department:
${input.department}

Appointment date:
${input.appointmentDate}

Required structure:
- Main symptoms
- Duration if mentioned
- Urgency level
- Suggested department
- Key concerns
- Recommended questions doctor may ask

Do not include a diagnosis.`,
                },
            ],
        });

        return completion.choices[0]?.message?.content?.trim() || fallback;
    } catch {
        return fallback;
    }
}

function buildFallbackAdminInsights(args: {
    appointments: Appointment[];
    emergencyRequests: EmergencyRequest[];
    chatLogs: ChatLog[];
}): AdminInsightCard[] {
    const departmentCounts = new Map<string, number>();
    args.appointments.forEach((appointment) => {
        departmentCounts.set(
            appointment.department,
            (departmentCounts.get(appointment.department) ?? 0) + 1
        );
    });

    const concernCounts = new Map<string, number>();
    args.chatLogs.forEach((log) => {
        const concern = safeText(log.suggested_department, "general symptom triage");
        concernCounts.set(concern, (concernCounts.get(concern) ?? 0) + 1);
    });

    const topDepartment =
        [...departmentCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ??
        "General Medicine";
    const commonConcern =
        [...concernCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ??
        "general symptom triage";
    const highUrgencyCount = args.appointments.filter(
        (appointment) => appointment.urgency === "High"
    ).length;
    const unresolvedEmergencies = args.emergencyRequests.filter(
        (request) => request.status === "Requested" || request.status === "Dispatched"
    ).length;

    return [
        {
            title: "Key Insight",
            content: `${topDepartment} is currently the highest-demand department, and recent chat activity also points to strong demand around ${commonConcern}.`,
        },
        {
            title: "Risk/Concern",
            content: `${highUrgencyCount} appointment requests are marked high urgency, and ${unresolvedEmergencies} emergency requests remain open or in dispatch.`,
        },
        {
            title: "Suggested Action",
            content: `Prioritize staffing coverage for ${topDepartment}, review high-urgency appointments early, and confirm emergency follow-up handoff status during the next operations check.`,
        },
    ];
}

function parseInsightCards(payload: string) {
    try {
        const parsed = JSON.parse(payload) as {
            cards?: Array<{ title: string; content: string }>;
        };

        const cards = parsed.cards?.filter(
            (card): card is { title: AdminInsightCard["title"]; content: string } =>
                (card.title === "Key Insight" ||
                    card.title === "Risk/Concern" ||
                    card.title === "Suggested Action") &&
                typeof card.content === "string" &&
                card.content.trim().length > 0
        );

        return cards?.length === 3 ? cards : null;
    } catch {
        return null;
    }
}

export async function generateAdminInsights(args: {
    appointments: Appointment[];
    emergencyRequests: EmergencyRequest[];
    chatLogs: ChatLog[];
}) {
    const fallback = buildFallbackAdminInsights(args);
    const openai = getOpenAIClient();

    if (!openai) {
        return fallback;
    }

    try {
        const completion = await openai.chat.completions.create({
            model: "gpt-4.1-mini",
            temperature: 0.2,
            messages: [
                {
                    role: "system",
                    content:
                        "You generate operational hospital admin insights. Do not diagnose. Do not prescribe. Focus on demand, staffing, queues, emergencies, and service patterns only. Return JSON only.",
                },
                {
                    role: "user",
                    content: `Review these recent operational signals and produce exactly three cards in JSON.

Appointments:
${args.appointments
    .map(
        (item) =>
            `- ${item.department} | ${item.urgency} | ${item.status} | ${safeText(item.symptoms, "No symptom note")}`
    )
    .join("\n")}

Emergency requests:
${args.emergencyRequests
    .map((item) => `- ${item.status} | ${safeText(item.notes, "No notes")}`)
    .join("\n")}

Chat logs:
${args.chatLogs
    .map(
        (item) =>
            `- urgency ${item.urgency} | department ${safeText(
                item.suggested_department,
                "unspecified"
            )} | ${item.user_message}`
    )
    .join("\n")}

Return strict JSON:
{
  "cards": [
    { "title": "Key Insight", "content": "..." },
    { "title": "Risk/Concern", "content": "..." },
    { "title": "Suggested Action", "content": "..." }
  ]
}

Keep the output operational and concise.`,
                },
            ],
        });

        const parsed = parseInsightCards(
            completion.choices[0]?.message?.content?.trim() ?? ""
        );

        return parsed ?? fallback;
    } catch {
        return fallback;
    }
}
