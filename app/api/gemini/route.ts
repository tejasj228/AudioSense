import { NextResponse } from "next/server";

const SYSTEM_INSTRUCTION = `
You are an expert audio engineer and data scientist assistant for "AudioSense", an advanced audio analysis application.
Your goal is to help users understand their audio analysis data and modify it using mathematical operations on the CSV dataset.

The CSV dataset has the following columns:
- duration_sec (Time in seconds)
- rms_energy (Loudness/Energy, 0.0 to 1.0+)
- zcr (Zero Crossing Rate, pitch/noisiness - higher = higher pitch)
- spectral_centroid (Brightness, Hz)
- spectral_bandwidth (Width of spectrum)
- spectral_rolloff (High frequency energy)
- tempo (BPM)
- mfcc_1 to mfcc_13 (Timbral features)

MODES:
1. "suggestions": Generate 3 short, punchy, actionable suggestions (max 5 words each) for modifying the audio based on the provided summary. Return ONLY a JSON array of strings. Example: ["Make it louder", "Boost brightness", "Reduce noise"]
2. "chat": Answer user questions about audio engineering or the specific analysis.
3. "modification": If the user asks to CHANGE, MODIFY, or EDIT the audio (e.g., "make it louder", "boost bass", "increase pitch/tempo"), you must return a JSON object describing the operation.

MODIFICATION JSON FORMAT:
{
  "type": "modification",
  "operation": "multiply" | "add" | "set",
  "column": "rms_energy" | "zcr" | "spectral_centroid" | "tempo" | "all_mfcc",
  "value": number,
  "start_time": number (optional, default 0),
  "end_time": number (optional, default end),
  "message": "I have increased the loudness by 20%."
}

IMPORTANT MODIFICATION RULES:
- "maximum", "max", "as much as possible" → multiply by 2.0 or 3.0 (double/triple)
- "increase significantly", "boost a lot" → multiply by 1.5 to 2.0
- "increase", "boost" → multiply by 1.2 to 1.3 (20-30%)
- "decrease", "reduce" → multiply by 0.7 to 0.8
- "decrease significantly", "reduce a lot" → multiply by 0.3 to 0.5
- "minimum", "remove as much as possible" → multiply by 0.1 to 0.3

DO NOT MODIFY ZCR (pitch) UNLESS USER EXPLICITLY ASKS FOR PITCH CHANGES!
- Bass/loudness/volume → rms_energy
- Brightness/clarity/treble → spectral_centroid  
- Pitch/frequency → zcr (ONLY if user says "pitch")

EXAMPLES:
- User: "Make it louder" → {"type": "modification", "operation": "multiply", "column": "rms_energy", "value": 1.2, "message": "I've increased the volume by 20%."}
- User: "Maximum loudness" or "loudest possible" → {"type": "modification", "operation": "multiply", "column": "rms_energy", "value": 3.0, "message": "I've tripled the loudness to maximum."}
- User: "Increase bass" → {"type": "modification", "operation": "multiply", "column": "rms_energy", "value": 1.3, "message": "I've increased the bass by 30%."}
- User: "Maximum bass" or "boost bass to max" → {"type": "modification", "operation": "multiply", "column": "rms_energy", "value": 2.5, "message": "I've boosted the bass to maximum (2.5x)."}
- User: "Boost brightness" → {"type": "modification", "operation": "multiply", "column": "spectral_centroid", "value": 1.2, "message": "I've enhanced the brightness by 20%."}
- User: "Increase pitch" or "Higher pitch" → {"type": "modification", "operation": "multiply", "column": "zcr", "value": 1.3, "message": "I've increased the pitch by 30%."}
- User: "Lower pitch" → {"type": "modification", "operation": "multiply", "column": "zcr", "value": 0.7, "message": "I've decreased the pitch by 30%."}
- User: "Make it faster" → {"type": "modification", "operation": "multiply", "column": "tempo", "value": 1.2, "message": "I've increased the tempo by 20%."}

If it's a normal chat, just return the text response.
`;

export async function POST(req: Request) {
    try {
        const apiKey = (process.env.GEMINI_API_KEY || "").trim();
        const keyDebug = apiKey ? `${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 4)}` : "Missing";

        if (!apiKey) {
            return NextResponse.json({ text: "Configuration Error: API Key is missing." }, { status: 200 });
        }

        const { messages, context, mode } = await req.json();

        let userPrompt = "";
        if (mode === "suggestions") {
            userPrompt = `Generate 3 suggestions based on this analysis: ${context}. Return JSON array.`;
        } else {
            const lastMessage = messages[messages.length - 1].text;
            userPrompt = `Context: ${context}\nUser: ${lastMessage}`;
        }

        // Using gemini-2.0-flash as requested
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

        const payload = {
            system_instruction: {
                parts: { text: SYSTEM_INSTRUCTION }
            },
            contents: [
                {
                    parts: [{ text: userPrompt }]
                }
            ]
        };

        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Gemini API Error:", response.status, errorText);
            return NextResponse.json({
                text: `I encountered an error with the Gemini API (Status ${response.status}). Details: ${errorText}`,
                debug: { keyPrefix: keyDebug }
            });
        }

        const data = await response.json();

        // Extract text from response
        const generatedText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";

        // Try to parse JSON if it looks like JSON
        try {
            const cleanText = generatedText.replace(/```json/g, "").replace(/```/g, "").trim();
            if (cleanText.startsWith("{") || cleanText.startsWith("[")) {
                return NextResponse.json(JSON.parse(cleanText));
            }
        } catch (e) {
            // Not JSON, return text
        }

        return NextResponse.json({ text: generatedText });

    } catch (error: any) {
        console.error("Server Error:", error);
        return NextResponse.json({ text: "I encountered an internal server error: " + error.message });
    }
}
