export const SUPPORTED_LANGUAGES = ["en", "si", "ta"] as const;

export type AppLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const LANGUAGE_LABELS: Record<AppLanguage, string> = {
    en: "English",
    si: "Sinhala",
    ta: "Tamil",
};

export function resolveLanguage(value: unknown): AppLanguage {
    if (value === "si" || value === "ta" || value === "en") {
        return value;
    }

    return "en";
}

export function getLanguageDisplayName(language: AppLanguage) {
    return LANGUAGE_LABELS[language];
}

export function getAssistantIntro(language: AppLanguage) {
    switch (language) {
        case "si":
            return "ආයුබෝවන්, මම Suwa Assist. මම සාමාන්‍ය සෞඛ්‍ය තොරතුරු ලබා දීමට, හමුවීම් වෙන්කරවා ගැනීමට උදව් කිරීමට, සහ සුදුසු රෝහල් අංශය වෙත ඔබව මාර්ගෝපදේශනය කිරීමට හැකියාව ඇත. මම වෛද්‍ය නිශ්චයයක් ලබා නොදෙමි.";
        case "ta":
            return "வணக்கம், நான் Suwa Assist. பொதுவான சுகாதார தகவலை வழங்கவும், நேரம் முன்பதிவு செய்ய உதவவும், சரியான மருத்துவ பிரிவிற்கு வழிகாட்டவும் முடியும். நான் மருத்துவ நோயறிதல் வழங்க மாட்டேன்.";
        default:
            return "Hello, I am Suwa Assist. I can provide general health information, help you book appointments, and guide you to the right department. I cannot provide a medical diagnosis.";
    }
}

export function getEducationalDisclaimer(language: AppLanguage) {
    switch (language) {
        case "si":
            return "මෙම තොරතුරු අධ්‍යාපනික අරමුණු සඳහා පමණක් වන අතර වෛද්‍ය නිශ්චයයක් නොවේ.";
        case "ta":
            return "இந்த தகவல் கல்வி நோக்கத்திற்கானது மட்டுமே; இது மருத்துவ நோயறிதல் அல்ல.";
        default:
            return "This information is educational and not a medical diagnosis.";
    }
}

export function getQueueDisclaimer(language: AppLanguage) {
    switch (language) {
        case "si":
            return "හදිසි අවස්ථා සහ වෛද්‍ය උපදේශන කාලය අනුව ඇස්තමේන්තුගත රැඳී සිටීමේ කාලය වෙනස් විය හැක.";
        case "ta":
            return "அவசர நிலைகள் மற்றும் ஆலோசனை நேரத்தின் நீளத்தைப் பொறுத்து கணிக்கப்பட்ட காத்திருப்பு நேரம் மாறலாம்.";
        default:
            return "Estimated waiting time may change based on emergencies and consultation duration.";
    }
}

export function getQueueFutureMessage(language: AppLanguage) {
    switch (language) {
        case "si":
            return "පෝලිම් අනාවැකිය හමුවීම් දිනයේ ලබා ගත හැකි වේ.";
        case "ta":
            return "வரிசை கணிப்பு உங்கள் நேர்முக நாள் அன்று கிடைக்கும்.";
        default:
            return "Queue prediction will be available on appointment day.";
    }
}
