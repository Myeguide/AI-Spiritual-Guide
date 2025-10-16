export function intelligentClassify(question: string): {
    type: string;
    confidence: number;
    reasoning: string;
    keywords: string[];
} {
    const lowerQuery = question.toLowerCase();

    // ============================================================
    // TIER 1: MOST SPECIFIC PATTERNS (Highest Priority)
    // ============================================================

    // RULE 1.1: Specific festivals/observances
    const festivals = [
        "mahashivratri", "shivratri", "diwali", "deepavali", "holi",
        "navratri", "durga puja", "janmashtami", "krishna janmashtami",
        "ram navami", "ganesh chaturthi", "dussehra", "vijayadashami",
        "ekadashi", "purnima", "amavasya", "makar sankranti", "pongal",
    ];

    for (const festival of festivals) {
        if (lowerQuery.includes(festival)) {
            return {
                type: "vedic_observance_rituals_dates",
                confidence: 0.98,
                reasoning: `Query mentions specific festival "${festival}" - seeking ritual guidance or spiritual significance`,
                keywords: [festival, "festival", "ritual"],
            };
        }
    }

    // RULE 1.2: Sexual/Intimacy issues with behavior descriptors
    const intimacyPatterns = [
        /\b(aggressive|rough|gentle|forceful|painful|violent).{0,30}(sex|intimacy|bed|bedroom|intercourse)\b/i,
        /\b(sex|intimacy|bed|bedroom|intercourse).{0,30}(aggressive|rough|gentle|forceful|painful|violent)\b/i,
        /\bduring sex\b/i,
        /\bin bed\b.{0,20}\b(problem|issue|rough|aggressive)\b/i,
    ];

    for (const pattern of intimacyPatterns) {
        if (pattern.test(lowerQuery)) {
            return {
                type: "sex_marriage_intimacy_desire",
                confidence: 0.98,
                reasoning: "Query about physical intimacy issues, sexual behavior, or bedroom dynamics",
                keywords: ["sex", "intimacy", "relationship"],
            };
        }
    }

    // RULE 1.3: Death/Afterlife
    if (/\b(death|die|dying|dead|afterlife|after death|rebirth|reincarnation)\b/.test(lowerQuery)) {
        return {
            type: "afterlife_cosmic_process",
            confidence: 0.98,
            reasoning: "Query explicitly asks about death, afterlife, or rebirth",
            keywords: ["death", "afterlife", "rebirth"],
        };
    }

    // RULE 1.4: Horoscope/Astrology
    if (/\b(horoscope|birth chart|kundali|kundli|astrology|jyotish|planetary)\b/.test(lowerQuery)) {
        return {
            type: "astrology",
            confidence: 0.98,
            reasoning: "Query about astrological predictions or birth charts",
            keywords: ["horoscope", "astrology"],
        };
    }

    // ============================================================
    // TIER 2: SPIRITUAL PRACTICES (Before checking children/emotions)
    // ============================================================

    // RULE 2.1: Meditation/Prayer/Spiritual Practice Queries
    // Check this BEFORE children_youth and emotional_spiritual
    const practiceKeywords = [
        "meditat", "meditation", "pray", "prayer", "praying",
        "chant", "chanting", "mantra", "worship", "puja",
        "yoga", "pranayama", "breathe", "breathing",
    ];

    for (const practice of practiceKeywords) {
        if (lowerQuery.includes(practice)) {
            // Check if it's asking "how to" or "best" or "which"
            if (
                /\b(how to|how do|how can|best|which|what.*meditation|what.*prayer|teach me|guide me|help me|show me)\b/.test(lowerQuery) ||
                /\b(meditation|prayer|chant|mantra|yoga|pranayama)\b/.test(lowerQuery)
            ) {
                return {
                    type: "practical_techniques",
                    confidence: 0.98,
                    reasoning: `Query asks about spiritual practice "${practice}" - needs practical guidance`,
                    keywords: [practice, "practice", "technique"],
                };
            }
        }
    }

    // ============================================================
    // TIER 3: CONTEXT-SPECIFIC PATTERNS
    // ============================================================

    // RULE 3.1: Children/Parenting (Must have explicit child-related words)
    if (/\b(child|children|son|daughter|kid|kids|baby|babies|toddler|teen|teenager)\b/.test(lowerQuery) ||
        (/\b(parenting|parent|raise|raising)\b/.test(lowerQuery) && /\b(child|children|son|daughter|kid)\b/.test(lowerQuery))) {
        return {
            type: "children_youth",
            confidence: 0.98,
            reasoning: "Query about raising children or parenting guidance",
            keywords: ["children", "parenting", "youth"],
        };
    }

    // RULE 3.2: Health/Ayurveda
    if (
        (/\b(pain|ache|sick|illness|disease|health|ailment)\b/.test(lowerQuery) &&
            /\b(ayurveda|ayurvedic|natural|herbal|remedy|cure)\b/.test(lowerQuery)) ||
        /\b(ayurveda|ayurvedic|vata|pitta|kapha|dosha)\b/.test(lowerQuery)
    ) {
        return {
            type: "ayurveda_health",
            confidence: 0.98,
            reasoning: "Query about health issues seeking Ayurvedic remedies",
            keywords: ["ayurveda", "health", "remedy"],
        };
    }

    // RULE 3.3: Emotions (NOT related to sex/intimacy)
    // Only match if no meditation/practice keywords
    if (
        /\b(anxious|anxiety|depressed|depression|sad|sadness|angry|anger|fear|worried|stress|stressed|grief|restless|overwhelmed)\b/.test(lowerQuery) &&
        !/\b(sex|intimacy|bedroom|intercourse)\b/.test(lowerQuery) &&
        !/\b(meditat|meditation|pray|prayer|chant|yoga|practice)\b/.test(lowerQuery)
    ) {
        return {
            type: "emotional_spiritual",
            confidence: 0.95,
            reasoning: "Query about emotional struggles or seeking inner peace",
            keywords: ["anxiety", "emotional", "peace"],
        };
    }

    // RULE 3.4: Comparing Religions
    if (
        /\b(difference between|compare|comparison|vs|versus)\b/.test(lowerQuery) &&
        /\b(hinduism|buddhism|islam|christianity|judaism|religion|faith)\b/.test(lowerQuery)
    ) {
        return {
            type: "comparative_theological",
            confidence: 0.98,
            reasoning: "Query compares different religions or faith traditions",
            keywords: ["compare", "religion", "difference"],
        };
    }

    // RULE 3.5: Deities/Sages/Saints
    const deities = [
        "krishna", "rama", "shiva", "vishnu", "durga", "lakshmi",
        "saraswati", "ganesh", "ganesha", "hanuman", "parvati",
    ];

    if (/\b(tell me about|who is|who was|story of|life of|teachings of|about|lord)\b/.test(lowerQuery)) {
        for (const deity of deities) {
            if (lowerQuery.includes(deity)) {
                return {
                    type: "sages_saints_deities",
                    confidence: 0.98,
                    reasoning: `Query asks about deity "${deity}" - seeking stories or teachings`,
                    keywords: [deity, "deity", "teachings"],
                };
            }
        }
    }

    // RULE 3.6: "What is" + Specific Spiritual Concept
    const spiritualConcepts = [
        "karma", "moksha", "mukti", "atman", "maya", "brahman",
        "dharma", "bhakti", "jnana", "vairagya", "samsara",
    ];

    if (/\b(what is|what does|meaning of|define|explain)\b/.test(lowerQuery)) {
        for (const concept of spiritualConcepts) {
            if (lowerQuery.includes(concept)) {
                return {
                    type: "definition_concept_spiritual_clarification",
                    confidence: 0.98,
                    reasoning: `Query asks for definition of spiritual concept "${concept}"`,
                    keywords: ["what is", concept, "definition"],
                };
            }
        }
    }

    // ============================================================
    // TIER 4: GENERAL QUESTION PATTERNS
    // ============================================================

    // RULE 4.1: Duty/Ethics/Dharma
    if (
        /\b(duty|duties|should i|ought i|is it right|is it wrong|right thing)\b/.test(lowerQuery) ||
        (/\bwhat.{0,20}do\b/.test(lowerQuery) && /\b(dharma|moral|ethical|responsibility)\b/.test(lowerQuery))
    ) {
        return {
            type: "dharma_smrti_law",
            confidence: 0.98,
            reasoning: "Query about moral duties, ethical dilemmas, or dharma",
            keywords: ["duty", "dharma", "ethics"],
        };
    }

    // ============================================================
    // TIER 5: KEYWORD SCORING FALLBACK
    // ============================================================

    const keywordMap: Record<string, string[]> = {
        "practical_techniques": [
            "meditat", "meditation", "breath", "yoga", "pranayam", "technique",
            "practice", "method", "exercise", "mantra", "chant",
        ],
        "emotional_spiritual": [
            "forgiv", "anger", "fear", "anxie", "sad", "grief", "trauma",
            "emotion", "heal", "peace", "hurt", "stress", "worry", "depres",
        ],
        "about_god": [
            "god", "divine", "lord", "creator", "brahman", "supreme",
            "deity", "sacred", "faith", "belief",
        ],
        "astrology": [
            "astrol", "zodiac", "planet", "star", "saturn", "jupiter",
        ],
        "sex_marriage_intimacy_desire": [
            "sex", "intimat", "partner", "marriage", "relation", "desire",
            "love", "attract", "couple", "husband", "wife",
        ],
        "afterlife_cosmic_process": [
            "afterlife", "death", "rebirth", "reincarn", "soul", "spirit",
            "cosmos", "universe", "eternal",
        ],
        "dharma_smrti_law": [
            "dharma", "duty", "law", "ethics", "moral", "conduct",
            "righteousness",
        ],
        "ayurveda_health": [
            "ayurveda", "dosha", "vata", "pitta", "kapha", "health",
            "heal", "medicine", "cure", "disease",
        ],
        "sages_saints_deities": [
            "sage", "saint", "rishi", "guru", "master", "krishna",
            "rama", "shiva", "vishnu", "devi",
        ],
        "children_youth": [
            "child", "children", "youth", "young", "parent", "father",
            "mother", "kid", "family", "education",
        ],
        "vedic_observance_rituals_dates": [
            "ritual", "observ", "puja", "festival", "fast", "cerem",
            "worship", "pooja", "vedic",
        ],
        "definition_concept_spiritual_clarification": [
            "what is", "what are", "definit", "concept", "meaning",
            "clarif", "understand", "explain",
        ],
        "comparative_theological": [
            "compar", "differ", "similar", "tradition", "religion",
            "scripture", "teaching", "philosophy",
        ],
    };

    let matchedType = "";
    let bestScore = 0;
    let matchedKeywords: string[] = [];

    for (const [docType, keywords] of Object.entries(keywordMap)) {
        let score = 0;
        const matches: string[] = [];

        for (const keyword of keywords) {
            if (lowerQuery.includes(keyword)) {
                score++;
                matches.push(keyword);
            }
        }

        if (score > bestScore) {
            bestScore = score;
            matchedType = docType;
            matchedKeywords = matches;
        }
    }

    if (bestScore >= 2) {
        const confidence = Math.min(0.5 + (bestScore * 0.1), 0.85);
        return {
            type: matchedType,
            confidence,
            reasoning: `Matched ${bestScore} keywords in ${matchedType}`,
            keywords: matchedKeywords.slice(0, 5),
        };
    }

    // ============================================================
    // ULTIMATE FALLBACK
    // ============================================================

    return {
        type: "",
        confidence: 0.98,
        reasoning: "No specific patterns matched - providing general guidance",
        keywords: [],
    };
}