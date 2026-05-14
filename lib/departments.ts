import type { Department } from "@/types";

export const departments: Department[] = [
    {
        id: "cardiology",
        name: "Cardiology",
        consultant: "Dr. Nimal Perera",
        specialty:
            "Chest pain, palpitations, blood pressure, heart-related symptoms",
        keywords: [
            "chest",
            "heart",
            "palpitation",
            "blood pressure",
            "breath",
            "breathing",
        ],
    },
    {
        id: "respiratory",
        name: "Respiratory Medicine",
        consultant: "Dr. Ayesha Fernando",
        specialty: "Cough, asthma, breathing difficulty, lung-related symptoms",
        keywords: ["cough", "asthma", "lung", "wheeze", "breath", "breathing"],
    },
    {
        id: "neurology",
        name: "Neurology",
        consultant: "Dr. Kavindu Silva",
        specialty:
            "Headache, dizziness, seizures, weakness, nerve-related symptoms",
        keywords: ["headache", "dizzy", "dizziness", "seizure", "weakness", "numb"],
    },
    {
        id: "gastro",
        name: "Gastroenterology",
        consultant: "Dr. Malini Jayawardena",
        specialty:
            "Stomach pain, vomiting, diarrhoea, digestion-related symptoms",
        keywords: [
            "stomach",
            "vomit",
            "diarrhea",
            "diarrhoea",
            "nausea",
            "abdomen",
            "abdominal",
        ],
    },
    {
        id: "general",
        name: "General Medicine",
        consultant: "Dr. Sahan Wijesinghe",
        specialty:
            "Fever, body pain, general illness, initial medical consultation",
        keywords: ["fever", "pain", "tired", "fatigue", "flu", "sick", "body"],
    },
];
