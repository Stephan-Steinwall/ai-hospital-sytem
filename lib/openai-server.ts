import OpenAI from "openai";

let openaiClient: OpenAI | null | undefined;

export function getOpenAIClient() {
    if (openaiClient !== undefined) {
        return openaiClient;
    }

    if (!process.env.OPENAI_API_KEY) {
        openaiClient = null;
        return openaiClient;
    }

    openaiClient = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
    });

    return openaiClient;
}
