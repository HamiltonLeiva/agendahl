import { serve } from "std/server";
import { createClient } from "supabase";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const FIREBASE_PROJECT_ID = Deno.env.get("FIREBASE_PROJECT_ID");
const FIREBASE_AUTH_TOKEN = Deno.env.get("FIREBASE_AUTH_TOKEN");

const SB_URL = Deno.env.get("SB_URL")!;
const SB_SERVICE_ROLE_KEY = Deno.env.get("SB_SERVICE_ROLE_KEY")!;

const supabase = createClient(SB_URL, SB_SERVICE_ROLE_KEY);

const corsHeaders = {
    "Access-Control-Allow-Origin": "*", // Permitimos cualquier origen ya que el dashboard y el sitio público pueden diferir
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface ChatContext {
    name?: string | null;
    contact?: string | null;
    division?: string | null;
    leadsSaved?: boolean;
}

interface RequestBody {
    message: string;
    sessionId?: string; // Nuevo: ID de sesión persistente
    history?: { role: string; content: string }[];
    context?: ChatContext;
}

interface GeminiPart {
    text: string;
}

interface GeminiContent {
    role: string;
    parts: GeminiPart[];
}

interface GeminiRequest {
    contents: GeminiContent[];
    system_instruction?: { parts: GeminiPart[] };
    generationConfig?: {
        temperature?: number;
        maxOutputTokens?: number;
        response_mime_type?: string;
    };
}



async function callGemini(contents: GeminiContent[], system?: string, isJson = false): Promise<string> {
    const models = [
        "gemini-1.5-flash", "gemini-1.5-flash-latest", "gemini-1.5-flash-001", "gemini-1.5-flash-002",
        "gemini-1.5-pro", "gemini-1.5-pro-latest", "gemini-1.0-pro", "gemini-1.0-pro-latest", "gemini-pro"
    ];
    const versions = ["v1", "v1beta"];
    let lastErr = "";

    // Limpieza y validación de roles (Google requiere: empieza con user, alterna user/model)
    const validContents: GeminiContent[] = [];
    let lastRole = "";
    contents.forEach(c => {
        if (c.role !== lastRole) {
            if (validContents.length === 0 && c.role !== "user") return; // No puede empezar con model
            validContents.push(c);
            lastRole = c.role;
        }
    });
    if (validContents.length === 0) validContents.push({ role: "user", parts: [{ text: "Hola" }] });
    if (validContents[validContents.length - 1].role !== "user") {
        validContents.push({ role: "user", parts: [{ text: "..." }] });
    }

    for (const model of models) {
        for (const ver of versions) {
            try {
                const url = `https://generativelanguage.googleapis.com/${ver}/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
                const payload: GeminiRequest = {
                    contents: validContents,
                    generationConfig: { temperature: isJson ? 0.1 : 0.7, response_mime_type: isJson ? "application/json" : undefined }
                };
                if (system) payload.system_instruction = { parts: [{ text: system }] };

                const resp = await fetch(url, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload)
                });
                const data = await resp.json();

                if (data.error) {
                    if (system && (data.error.message.includes("system_instruction") || data.error.message.includes("Unknown name"))) {
                        const fallbackContents = [
                            { role: "user", parts: [{ text: `INST: ${system}` }] },
                            { role: "model", parts: [{ text: "OK" }] },
                            ...validContents
                        ];
                        const fResp = await fetch(url, {
                            method: "POST", headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ contents: fallbackContents, generationConfig: payload.generationConfig })
                        });
                        const fData = await fResp.json();
                        if (!fData.error) return fData.candidates?.[0]?.content?.parts?.[0]?.text || "";
                    }
                    lastErr = data.error.message;
                    continue;
                }
                return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
            } catch (err: unknown) { lastErr = err instanceof Error ? err.message : String(err); }
        }
    }
    return `Hamilton AI: Protocolo en pausa (Error: ${lastErr})`;
}

async function saveToFirestore(data: Record<string, string>) {

    if (!FIREBASE_PROJECT_ID) return;
    
    const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/leads`;
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    
    if (FIREBASE_AUTH_TOKEN) {
        headers["Authorization"] = `Bearer ${FIREBASE_AUTH_TOKEN}`;
    }

    try {
        const fields: Record<string, { stringValue: string }> = {};
        for (const [key, value] of Object.entries(data)) {
            fields[key] = { stringValue: value || "N/D" };
        }
        fields["timestamp"] = { stringValue: new Date().toISOString() };
        fields["status"] = { stringValue: "Nuevo" };

        const resp = await fetch(url, {
            method: "POST",
            headers,
            body: JSON.stringify({ fields }),
        });
        
        if (!resp.ok) {
            const errText = await resp.text();
            console.error(`[CRM] Firestore Sync Failed: ${resp.status}`, errText);
        }
    } catch (err: unknown) {
        console.error("[CRM] Critical Error during sync", err instanceof Error ? err.message : String(err));
    }

}

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured");

        const body = (await req.json()) as RequestBody;
        const { message, sessionId } = body;
        const currentDateTime = new Date().toLocaleString("es-ES", { timeZone: "America/Costa_Rica" });
        let aiMessage = "";

        
        // --- STEP 0: RECUPERACIÓN DE SESIÓN ---
        let finalContext: ChatContext = { name: null, contact: null, division: null, leadsSaved: false };
        let finalHistory: { role: string; content: string }[] = [];
        let finalSessionId = sessionId;

        if (sessionId && sessionId !== "null" && sessionId !== "undefined" && sessionId.length > 10) {
            console.log(`[Session] Investigando persistencia para ID: ${sessionId}`);
            const { data: sessionData, error } = await supabase
                .from("chat_sessions")
                .select("context, history")
                .eq("id", sessionId)
                .single();
            
            if (sessionData && !error) {
                console.log(`[Session] Datos recuperados exitosamente de Supabase`);
                const dbCtx = sessionData.context || {};
                // Merging Blindado: Prioridad absoluta a lo que YA ESTÁ en la base de datos
                finalContext = {
                    name: dbCtx.name || body.context?.name || null,
                    contact: dbCtx.contact || body.context?.contact || null,
                    division: dbCtx.division || body.context?.division || null,
                    leadsSaved: dbCtx.leadsSaved ?? body.context?.leadsSaved ?? false
                };
                finalHistory = sessionData.history || [];
            } else {
                console.warn(`[Session] No se encontró sesión o error:`, error?.message);
                // Si no hay en DB, usamos lo que mandó el frontend (fallback)
                if (body.context) finalContext = { ...finalContext, ...body.context };
            }
        } else if (body.context) {
            finalContext = { ...finalContext, ...body.context };
        }

        // --- STEP 1: EXTRACCIÓN DE DATOS ---
        const historyContext = finalHistory.slice(-5).map(m => `${m.role}: ${m.content}`).join("\n");
        const extractionPrompt = `Eres un experto en clasificación de leads para Hamilton Leiva Group.
        INFO ACTUAL: ${JSON.stringify(finalContext)}
        MENSAJE: "${message}"
        ${finalHistory.length > 0 ? `CONTEXTO RECIENTE:\n${historyContext}` : ""}
        
        REGLAS CRÍTICAS:
        1. Extrae: "name", "contact" y "division".
        2. Clasifica "division" SOLO como: "Solutions", "Software", "App", "Media".
        3. FORMATO: JSON { "name": string|null, "contact": string|null, "division": string|null }`;

        const extractionJson = await callGemini([{ role: "user", parts: [{ text: extractionPrompt }] }], undefined, true);
        if (extractionJson && !extractionJson.startsWith("Hamilton")) {
            try {
                const newData = JSON.parse(extractionJson);
                if (newData.name && newData.name !== "null") finalContext.name = newData.name;
                if (newData.contact && newData.contact !== "null") finalContext.contact = newData.contact;
                if (newData.division && newData.division !== "null") finalContext.division = newData.division;
            } catch (e) { console.error("[AI] Error parseando extracción", e); }
        }

        // --- STEP 2: GENERACIÓN DE RESPUESTA ---
        const system_prompt = `Eres Hamilton AI, Senior Executive Advisor de Hamilton Leiva Group. 
        Asesoría estratégica. Fecha: ${currentDateTime}. Cliente: ${finalContext.name || 'N/D'}. 
        Si hay Nombre/Contacto, di: "He registrado tu solicitud. Un representante senior se contactará contigo".`;

        const chatContents: GeminiContent[] = [];
        finalHistory.slice(-6).forEach(m => {
            chatContents.push({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] });
        });
        chatContents.push({ role: "user", parts: [{ text: message }] });

        aiMessage = await callGemini(chatContents, system_prompt);

        // --- STEP 3: CRM & PERSISTENCIA ---
        const hasData = finalContext.name && finalContext.contact && finalContext.name !== "N/D" && finalContext.contact !== "N/D";
        if (hasData && !finalContext.leadsSaved) {
            await saveToFirestore({
                name: finalContext.name!,
                contact: finalContext.contact!,
                division: finalContext.division || "General",
                message,
                source: "Hamilton AI Ultra-Redundant v5.0"
            });
            finalContext.leadsSaved = true;
        }

        const updatedHistory = [...finalHistory, { role: "user", content: message }, { role: "assistant", content: aiMessage }].slice(-20);

        if (finalSessionId && finalSessionId !== "null") {
            await supabase
                .from("chat_sessions")
                .update({ context: finalContext, history: updatedHistory })
                .eq("id", finalSessionId);
        } else {
            const { data: newSession } = await supabase
                .from("chat_sessions")
                .insert([{ context: finalContext, history: updatedHistory }])
                .select()
                .single();
            if (newSession) finalSessionId = newSession.id;
        }

        return new Response(JSON.stringify({ 
            reply: aiMessage, 
            context: finalContext,
            sessionId: finalSessionId 
        }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }
        });

    } catch (err: unknown) {
        console.error("[Fatal] ", err instanceof Error ? err.message : String(err));
        return new Response(JSON.stringify({ error: "Internal Server Error" }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
    }

});

