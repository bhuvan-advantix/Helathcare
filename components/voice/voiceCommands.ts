/**
 * Voice Command Definitions
 * All command mappings are defined here — no hardcoding in UI components.
 * Each command has keyword triggers, an action type, and optional metadata.
 */

export type VoiceCommandAction =
    | { type: 'navigate'; path: string }
    | { type: 'navigate_highlight'; path: string; highlight: string }
    | { type: 'navigate_section'; path: string; section: string };

export interface VoiceCommand {
    /** Keywords that will trigger this command (all lowercased) */
    triggers: string[];
    /** Human-readable label shown in toast */
    label: string;
    /** Action to execute */
    action: VoiceCommandAction;
}

export const VOICE_COMMANDS: VoiceCommand[] = [

    // ════════════════════════════════════════════════
    //  NAVIGATION — DASHBOARD
    // ════════════════════════════════════════════════
    {
        triggers: [
            'go to dashboard', 'open dashboard', 'dashboard', 'home', 'go home',
            'take me home', 'main page', 'go back', 'home page', 'show dashboard',
            'my dashboard', 'health home', 'back to dashboard', 'go to home',
            'open home', 'health dashboard', 'take me to dashboard',
        ],
        label: 'Going to Dashboard',
        action: { type: 'navigate', path: '/dashboard' },
    },

    // ════════════════════════════════════════════════
    //  NAVIGATION — TIMELINE
    // ════════════════════════════════════════════════
    {
        triggers: [
            'go to timeline', 'open timeline', 'timeline', 'health timeline',
            'go to health timeline', 'show timeline', 'health history',
            'my history', 'show history', 'events', 'my events', 'health events',
            'show my events', 'view timeline', 'view history', 'past events',
            'medical history', 'my medical history', 'all events',
            'take me to timeline', 'open my timeline',
        ],
        label: 'Going to Timeline',
        action: { type: 'navigate', path: '/timeline' },
    },

    // ════════════════════════════════════════════════
    //  NAVIGATION — DIAGNOSTIC
    // ════════════════════════════════════════════════
    {
        triggers: [
            'go to diagnostic', 'open diagnostic', 'diagnostic', 'diagnostics',
            'go to diagnostics', 'my diagnosis', 'show diagnosis', 'condition',
            'my condition', 'health check', 'go to health check', 'chronic',
            'chronic conditions', 'show conditions', 'view conditions',
            'my conditions', 'health conditions', 'disease', 'my disease',
            'take me to diagnostic', 'open diagnostics',
        ],
        label: 'Going to Diagnostics',
        action: { type: 'navigate', path: '/diagnostic' },
    },

    // ════════════════════════════════════════════════
    //  NAVIGATION — PROFILE
    // ════════════════════════════════════════════════
    {
        triggers: [
            'go to profile', 'open profile', 'my profile', 'profile',
            'my account', 'account', 'settings', 'my details', 'personal info',
            'show profile', 'view profile', 'personal details', 'my info',
            'edit profile', 'update profile', 'take me to profile',
            'account settings', 'user profile',
        ],
        label: 'Going to Profile',
        action: { type: 'navigate', path: '/profile' },
    },

    // ════════════════════════════════════════════════
    //  NAVIGATION — HELP & SUPPORT
    // ════════════════════════════════════════════════
    {
        triggers: [
            'help', 'support', 'help me', 'i need help', 'go to help',
            'open help', 'help and support', 'customer support', 'contact support',
            'show help', 'help page',
        ],
        label: 'Going to Help & Support',
        action: { type: 'navigate', path: '/help-support' },
    },

    // ════════════════════════════════════════════════
    //  LAB REPORTS
    // ════════════════════════════════════════════════
    {
        triggers: [
            'go to lab reports', 'open lab reports', 'lab reports', 'my reports',
            'reports', 'my lab reports', 'test reports', 'blood reports',
            'my tests', 'show reports', 'view reports', 'lab test', 'lab results',
            'my lab results', 'show lab reports', 'diagnostic reports',
            'my diagnostic reports', 'report', 'show test results',
            'pathology reports', 'my pathology reports',
        ],
        label: 'Going to Lab Reports',
        action: { type: 'navigate_section', path: '/dashboard', section: 'labreports' },
    },

    // ════════════════════════════════════════════════
    //  HEALTH PARAMETERS — BLOOD GLUCOSE / SUGAR
    // ════════════════════════════════════════════════
    {
        triggers: [
            'what is my sugar level', 'what is my sugar', 'sugar levels', 'blood sugar',
            'glucose level', 'what is my blood glucose', 'my glucose', 'show sugar',
            'diabetes', 'glucose', 'my sugar', 'sugar test', 'blood test sugar',
            'fasting sugar', 'show glucose', 'sugar report', 'blood glucose',
            'glucose report', 'sugar value', 'what is my glucose level',
            'check sugar', 'check glucose', 'sugar reading', 'glucose reading',
            'my blood sugar', 'sugar', 'show blood sugar',
        ],
        label: 'Showing Blood Glucose',
        action: { type: 'navigate', path: '/dashboard/health?param=Blood%20Glucose' },
    },

    // ════════════════════════════════════════════════
    //  HEALTH PARAMETERS — BLOOD PRESSURE
    // ════════════════════════════════════════════════
    {
        triggers: [
            'blood pressure', 'what is my blood pressure', 'my pressure',
            'show blood pressure', 'bp', 'bp level', 'my bp', 'show bp',
            'hypertension', 'pressure report', 'blood pressure level',
            'what is my bp', 'check bp', 'check blood pressure',
            'bp reading', 'blood pressure reading', 'pressure', 'my blood pressure',
        ],
        label: 'Showing Blood Pressure',
        action: { type: 'navigate', path: '/dashboard/health?param=Blood%20Pressure' },
    },

    // ════════════════════════════════════════════════
    //  HEALTH PARAMETERS — HBA1C
    // ════════════════════════════════════════════════
    {
        triggers: [
            'hba1c', 'what is my hba1c', 'show hba1c', 'glycated hemoglobin',
            'a1c', 'hemoglobin', 'hb level', 'glycated', 'average sugar',
            'three month sugar', 'glycated haemoglobin', 'show a1c',
            'my hba1c', 'check hba1c', 'hb a1c',
        ],
        label: 'Showing HbA1c',
        action: { type: 'navigate', path: '/dashboard/health?param=HbA1c' },
    },

    // ════════════════════════════════════════════════
    //  HEALTH PARAMETERS — CHOLESTEROL
    // ════════════════════════════════════════════════
    {
        triggers: [
            'cholesterol', 'what is my cholesterol', 'total cholesterol',
            'show cholesterol', 'fat level', 'lipid', 'triglycerides',
            'heart report', 'ldl', 'hdl', 'my cholesterol', 'check cholesterol',
            'lipid profile', 'cholesterol level', 'cholesterol reading',
        ],
        label: 'Showing Total Cholesterol',
        action: { type: 'navigate', path: '/dashboard/health?param=Total%20Cholesterol' },
    },

    // ════════════════════════════════════════════════
    //  HEALTH PARAMETERS — ALL PARAMETERS
    // ════════════════════════════════════════════════
    {
        triggers: [
            'health parameters', 'my health parameters', 'show health parameters',
            'vital signs', 'vitals', 'my vitals', 'show vitals', 'health stats',
            'health numbers', 'my health numbers', 'all parameters',
            'health metrics', 'my metrics', 'health data',
        ],
        label: 'Showing Health Parameters',
        action: { type: 'navigate_section', path: '/dashboard', section: 'health-parameters' },
    },

    // ════════════════════════════════════════════════
    //  MEDICATIONS
    // ════════════════════════════════════════════════
    {
        triggers: [
            'what medicines do i need to take', 'my medicines', 'my medications',
            'show medications', 'show medicines', 'what medication', 'medication list',
            'medicine list', 'what tablets', 'my tablets', 'what should i take',
            'what do i need to take', 'what drugs', 'my pills', 'my drugs',
            'show my pills', 'tablet list', 'dosage', 'what is my dosage',
            'medicine', 'meds', 'my meds', 'medications', 'medicines',
            'pills', 'drugs', 'tablets', 'current medications', 'active medications',
            'show meds', 'view medications', 'view medicines',
            'what medicine should i take', 'current medicines',
            'what pills do i take', 'show my medications',
        ],
        label: 'Showing Medications',
        action: { type: 'navigate_section', path: '/dashboard', section: 'medications' },
    },

    // ════════════════════════════════════════════════
    //  APPOINTMENTS
    // ════════════════════════════════════════════════
    {
        triggers: [
            'upcoming appointments', 'what appointments', 'my appointments',
            'show appointments', 'appointments', 'upcoming events', 'what is my next appointment',
            'next appointment', 'when is my appointment', 'doctor visit', 'next visit',
            'schedule', 'my schedule', 'what is coming up', 'show upcoming',
            'future events', 'pending events', 'pending appointments',
            'doctor appointment', 'upcoming schedule', 'my next appointment',
            'what upcoming', 'upcoming', 'coming appointments', 'show schedule',
            'appointment list', 'my appointment', 'show upcoming appointments',
        ],
        label: 'Showing Appointments',
        action: { type: 'navigate_section', path: '/timeline', section: 'upcoming' },
    },

    // ════════════════════════════════════════════════
    //  PATIENT ID
    // ════════════════════════════════════════════════
    {
        triggers: [
            'what is my patient id', 'my patient id', 'patient id', 'show patient id',
            'what is my id', 'my id', 'niraiva id', "what's my id", 'show my id',
            'health id', 'my health id', 'unique id', 'my unique id',
            'what is my health card id', 'card number', 'show card',
            'niraiva patient id', 'hospital id', 'my hospital id',
            'my registration id', 'registration number', 'my registration number',
            'patient number', 'my patient number', 'id number', 'my id number',
        ],
        label: 'Highlighting Patient ID',
        action: { type: 'navigate_highlight', path: '/dashboard', highlight: 'patient-id' },
    },
];

// ════════════════════════════════════════════════════
//  FILLER WORDS TO STRIP BEFORE MATCHING
// ════════════════════════════════════════════════════
const FILLER_WORDS = [
    'please', 'can you', 'could you', 'i want to', 'i want', 'i need to',
    'i need', 'show me', 'take me to', 'take me', 'navigate to', 'navigate',
    'open the', 'open up', 'open', 'go to the', 'go to', 'go',
    'can i see', 'let me see', 'let me', 'i would like to see',
    'i would like', 'tell me', 'find', 'search for', 'where is my',
    'where is', 'where are my', 'where are', 'check my', 'check',
    'view my', 'view the', 'view', 'display my', 'display',
    'the', 'a', 'an', 'my', 'me',
];

/**
 * Strip filler/stop words from a spoken transcript to improve matching accuracy.
 */
export function stripFillerWords(text: string): string {
    let cleaned = text.toLowerCase().trim();
    // Sort by length descending so longer phrases are stripped before short ones
    const sorted = [...FILLER_WORDS].sort((a, b) => b.length - a.length);
    for (const filler of sorted) {
        cleaned = cleaned.replace(new RegExp(`^${filler}\\s+`, 'g'), '').trim();
        cleaned = cleaned.replace(new RegExp(`\\s+${filler}$`, 'g'), '').trim();
    }
    return cleaned.trim();
}

/**
 * Match a spoken transcript against all registered voice commands.
 * Uses multi-pass strategy:
 *  1. Exact match
 *  2. Contains match (both directions)
 *  3. Cleaned/filler-stripped match
 *  4. Word-overlap match (≥40% overlap threshold)
 *
 * Returns the best matching command or null.
 */
export function matchVoiceCommand(transcript: string): VoiceCommand | null {
    const raw = transcript.toLowerCase().trim();
    const cleaned = stripFillerWords(raw);

    // Helper: score a single input string against all triggers of a command
    const score = (input: string, command: VoiceCommand): number => {
        let best = 0;
        for (const trigger of command.triggers) {
            // Exact match → maximum score
            if (input === trigger) return 10000;

            // Contains match
            if (input.includes(trigger) || trigger.includes(input)) {
                best = Math.max(best, 500 + trigger.length);
            }

            // Word overlap (relaxed to 40%)
            const triggerWords = trigger.split(' ').filter(Boolean);
            const inputWords = input.split(' ').filter(Boolean);
            const overlap = triggerWords.filter(w =>
                inputWords.some(iw => iw === w || iw.startsWith(w) || w.startsWith(iw))
            ).length;
            const ratio = overlap / triggerWords.length;
            if (ratio >= 0.40) {
                best = Math.max(best, ratio * 100 + trigger.length);
            }
        }
        return best;
    };

    let bestCommand: VoiceCommand | null = null;
    let bestScore = 0;

    for (const command of VOICE_COMMANDS) {
        // Pass 1: raw transcript
        const s1 = score(raw, command);
        // Pass 2: filler-stripped transcript
        const s2 = score(cleaned, command);
        const s = Math.max(s1, s2);

        if (s > bestScore) {
            bestScore = s;
            bestCommand = command;
        }
    }

    // Minimum score threshold to avoid wildly wrong matches
    return bestScore >= 5 ? bestCommand : null;
}
