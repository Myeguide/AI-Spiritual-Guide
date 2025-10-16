export const documentTypes = [
    "about_god",
    "afterlife_cosmic_process",
    "astrology",
    "ayurveda_health",
    "children_youth",
    "comparative_theological",
    "dharma_smrti_law",
    "emotional_spiritual",
    "practical_techniques",
    "sages_saints_deities",
    "sex_marriage_intimacy_desire",
    "vedic_observance_rituals_dates",
    "definition_concept_spiritual_clarification",
];

export type SpiritualDocument = {
    id: string;
    type: string;
    content: string;
    title: string;
    description: string;
}