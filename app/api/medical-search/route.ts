import { NextResponse } from "next/server";
import {
    lookupTrustedMedicalInfo,
    summarizeTrustedMedicalInfo,
} from "@/lib/medical-search";

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("query")?.trim();

    if (!query) {
        return NextResponse.json(
            { error: "Query is required." },
            { status: 400 }
        );
    }

    try {
        const results = await lookupTrustedMedicalInfo(query);
        const summary = await summarizeTrustedMedicalInfo(query, results);

        return NextResponse.json({
            results,
            summary,
            disclaimer:
                "This information is educational and not a medical diagnosis.",
        });
    } catch (error) {
        console.error("Medical search error:", error);

        return NextResponse.json(
            { error: "Failed to search trusted medical sources." },
            { status: 500 }
        );
    }
}
