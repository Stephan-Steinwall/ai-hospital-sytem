import { NextResponse } from "next/server";
import { localizeMedicalSummary } from "@/lib/ai-features";
import { getEducationalDisclaimer, resolveLanguage } from "@/lib/languages";
import {
    lookupTrustedMedicalInfo,
    summarizeTrustedMedicalInfo,
} from "@/lib/medical-search";

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("query")?.trim();
    const language = resolveLanguage(searchParams.get("language"));

    if (!query) {
        return NextResponse.json(
            { error: "Query is required." },
            { status: 400 }
        );
    }

    try {
        const results = await lookupTrustedMedicalInfo(query);
        const summary = await summarizeTrustedMedicalInfo(query, results, language);
        let localizedSummary = summary;

        if (summary) {
            localizedSummary = await localizeMedicalSummary(query, summary, language);
        }

        return NextResponse.json({
            results,
            summary: localizedSummary,
            disclaimer: getEducationalDisclaimer(language),
        });
    } catch (error) {
        console.error("Medical search error:", error);

        return NextResponse.json(
            { error: "Failed to search trusted medical sources." },
            { status: 500 }
        );
    }
}
