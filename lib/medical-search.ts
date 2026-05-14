import OpenAI from "openai";
import type { MedicalSearchItem } from "@/types";

const MEDLINE_BASE_URL = "https://wsearch.nlm.nih.gov/ws/query";
const NIH_BASE_URL =
    "https://clinicaltables.nlm.nih.gov/api/conditions/v3/search";

function stripHtml(input: string) {
    return input.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function decodeEntities(input: string) {
    return input
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">");
}

function cleanText(input: string, fallback: string) {
    const value = decodeEntities(stripHtml(input)).replace(/\s+/g, " ").trim();
    return value || fallback;
}

function trimSummary(summary: string, maxLength = 220) {
    if (summary.length <= maxLength) {
        return summary;
    }

    return `${summary.slice(0, maxLength).trimEnd()}...`;
}

async function fetchMedlineResults(query: string) {
    const encodedQuery = encodeURIComponent(query);
    const response = await fetch(
        `${MEDLINE_BASE_URL}?db=healthTopics&term=${encodedQuery}&retmax=3`,
        {
            headers: {
                Accept: "application/json, application/xml;q=0.9",
            },
            cache: "no-store",
        }
    );

    if (!response.ok) {
        return [] satisfies MedicalSearchItem[];
    }

    const text = await response.text();
    const documents = [...text.matchAll(/<document\b[\s\S]*?<\/document>/g)].map(
        (match) => match[0]
    );

    return documents
        .map((document) => {
            const title = cleanText(
                document.match(/<content name="title">([\s\S]*?)<\/content>/)?.[1] ??
                    "",
                "MedlinePlus Topic"
            );
            const summary = cleanText(
                document.match(
                    /<content name="FullSummary">([\s\S]*?)<\/content>/
                )?.[1] ??
                    "",
                "General patient education from MedlinePlus."
            );
            const url =
                document.match(/<url[^>]*>([\s\S]*?)<\/url>/)?.[1]?.trim() ??
                "https://medlineplus.gov/";

            return {
                title,
                summary: trimSummary(summary),
                source: "MedlinePlus" as const,
                url,
            };
        })
        .filter((item) => item.title && item.url)
        .slice(0, 3);
}

async function fetchNihResults(query: string) {
    const encodedQuery = encodeURIComponent(query);
    const response = await fetch(
        `${NIH_BASE_URL}?terms=${encodedQuery}&maxList=3`,
        { cache: "no-store" }
    );

    if (!response.ok) {
        return [] satisfies MedicalSearchItem[];
    }

    const payload = (await response.json()) as [number, string[], unknown, string[][]];
    const labels = payload?.[1] ?? [];

    return labels.slice(0, 3).map((label) => ({
        title: cleanText(label, "NIH Reference"),
        summary:
            "NIH Clinical Tables entry for general terminology and educational reference.",
        source: "NIH" as const,
        url: `https://clinicaltables.nlm.nih.gov/search.html?query=${encodedQuery}`,
    }));
}

function dedupeResults(results: MedicalSearchItem[]) {
    const seen = new Set<string>();

    return results.filter((item) => {
        const key = `${item.source}:${item.title.toLowerCase()}`;

        if (seen.has(key)) {
            return false;
        }

        seen.add(key);
        return true;
    });
}

export async function lookupTrustedMedicalInfo(query: string) {
    const [medlineResults, nihResults] = await Promise.all([
        fetchMedlineResults(query),
        fetchNihResults(query),
    ]);

    return dedupeResults([...medlineResults, ...nihResults]).slice(0, 5);
}

export async function summarizeTrustedMedicalInfo(
    query: string,
    results: MedicalSearchItem[]
) {
    if (!results.length || !process.env.OPENAI_API_KEY) {
        return null;
    }

    const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
    });

    const completion = await openai.chat.completions.create({
        model: "gpt-4.1-mini",
        temperature: 0.2,
        messages: [
            {
                role: "system",
                content:
                    "You summarize trusted medical education sources for patients. Do not diagnose, do not prescribe, do not claim certainty, and keep the response educational and short.",
            },
            {
                role: "user",
                content: `User topic: ${query}

Trusted source snippets:
${results
    .map(
        (item, index) =>
            `${index + 1}. [${item.source}] ${item.title}: ${item.summary}`
    )
    .join("\n")}

Write a 2-3 sentence educational summary. Include a reminder that this is not a medical diagnosis.`,
            },
        ],
    });

    return (
        completion.choices[0]?.message?.content?.trim() ??
        "This information is educational and not a medical diagnosis."
    );
}
