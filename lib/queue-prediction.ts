import type { AppLanguage } from "@/lib/languages";
import { getQueueDisclaimer, getQueueFutureMessage } from "@/lib/languages";

interface QueuePredictionInput {
    id: string;
    appointment_date: string;
    appointment_time?: string | null;
    queue_number?: number | null;
    current_queue_number?: number | null;
    department: string;
    status: string;
}

export interface QueuePredictionResult {
    appointmentId: string;
    label: string;
    explanation: string;
    disclaimer: string;
    estimatedMinutes: number | null;
    remainingPatients: number | null;
}

const DEFAULT_AVERAGE_CONSULTATION_MINUTES = 10;

function getAverageConsultationMinutes() {
    const envValue = Number(process.env.AVERAGE_CONSULTATION_MINUTES ?? "10");

    if (Number.isFinite(envValue) && envValue >= 1 && envValue <= 60) {
        return envValue;
    }

    return DEFAULT_AVERAGE_CONSULTATION_MINUTES;
}

function isToday(dateString: string) {
    const appointmentDate = new Date(dateString);
    const today = new Date();

    return appointmentDate.toDateString() === today.toDateString();
}

function formatExplanation(
    remainingPatients: number,
    estimatedMinutes: number,
    averageConsultationMinutes: number,
    language: AppLanguage
) {
    switch (language) {
        case "si":
            return `ඔබට පෙර රෝගීන් ${remainingPatients} දෙනෙකු පමණ සිටිය හැක. සෑම උපදේශනයක් සඳහාම සාමාන්‍යයෙන් මිනිත්තු ${averageConsultationMinutes} ක් ගත වේ යැයි ගණනය කළ විට, රැඳී සිටීමේ කාලය මිනිත්තු ${estimatedMinutes} ක් පමණ විය හැක.`;
        case "ta":
            return `உங்களுக்குமுன் சுமார் ${remainingPatients} நோயாளிகள் இருக்கலாம். ஒவ்வொரு ஆலோசனையும் சராசரியாக ${averageConsultationMinutes} நிமிடங்கள் எடுக்கும் என கணித்தால், காத்திருப்பு நேரம் சுமார் ${estimatedMinutes} நிமிடங்கள் இருக்கலாம்.`;
        default:
            return `There may be about ${remainingPatients} patients ahead of you. Based on an average consultation time of ${averageConsultationMinutes} minutes, your wait may be around ${estimatedMinutes} minutes.`;
    }
}

export function buildQueuePrediction(
    appointment: QueuePredictionInput,
    language: AppLanguage
): QueuePredictionResult {
    const disclaimer = getQueueDisclaimer(language);

    if (!isToday(appointment.appointment_date)) {
        return {
            appointmentId: appointment.id,
            label: getQueueFutureMessage(language),
            explanation: getQueueFutureMessage(language),
            disclaimer,
            estimatedMinutes: null,
            remainingPatients: null,
        };
    }

    if (
        typeof appointment.queue_number !== "number" ||
        typeof appointment.current_queue_number !== "number"
    ) {
        return {
            appointmentId: appointment.id,
            label:
                language === "en"
                    ? "Queue details are not available yet."
                    : language === "si"
                      ? "පෝලිම් විස්තර තවම ලබා ගත නොහැක."
                      : "வரிசை விவரங்கள் இன்னும் கிடைக்கவில்லை.",
            explanation:
                language === "en"
                    ? "Staff have not assigned both queue numbers yet."
                    : language === "si"
                      ? "කාර්ය මණ්ඩලය තවමත් අදාළ පෝලිම් අංක දෙකම යොදවා නොමැත."
                      : "பணியாளர்கள் இன்னும் இரு வரிசை எண்களையும் வழங்கவில்லை.",
            disclaimer,
            estimatedMinutes: null,
            remainingPatients: null,
        };
    }

    const averageConsultationMinutes = getAverageConsultationMinutes();
    const remainingPatients = Math.max(
        appointment.queue_number - appointment.current_queue_number,
        0
    );
    const estimatedMinutes = remainingPatients * averageConsultationMinutes;

    return {
        appointmentId: appointment.id,
        label:
            language === "en"
                ? `Estimated wait: ${estimatedMinutes} min`
                : language === "si"
                  ? `ඇස්තමේන්තුගත රැඳී සිටීම: මිනිත්තු ${estimatedMinutes}`
                  : `மதிப்பிடப்பட்ட காத்திருப்பு: ${estimatedMinutes} நிமிடம்`,
        explanation: formatExplanation(
            remainingPatients,
            estimatedMinutes,
            averageConsultationMinutes,
            language
        ),
        disclaimer,
        estimatedMinutes,
        remainingPatients,
    };
}
