
import { GoogleGenAI, Type } from "@google/genai";

// Helper to get client instance
const getAiClient = () => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('VITE_GEMINI_API_KEY not configured. AI features will be disabled.');
    throw new Error('Gemini API key not configured');
  }
  return new GoogleGenAI({ apiKey });
};

export const checkEligibility = async (patientNotes: string, protocolText: string): Promise<{ eligible: string; reasoning: string }> => {
  try {
    const ai = getAiClient();
    const modelId = 'gemini-2.5-flash';
    const prompt = `
      You are a Clinical Research Associate. Analyze the following patient notes against the protocol criteria provided below.
      
      PROTOCOL SUMMARY:
      ${protocolText}

      PATIENT NOTES:
      ${patientNotes}

      Determine if the patient appears eligible. 
      Return a JSON object with:
      - "eligible": "Yes", "No", or "Potentially"
      - "reasoning": A concise explanation referencing specific criteria.
    `;

    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            eligible: { type: Type.STRING, enum: ["Yes", "No", "Potentially"] },
            reasoning: { type: Type.STRING }
          }
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    return JSON.parse(text);

  } catch (error) {
    console.error("AI Eligibility Check Failed:", error);
    return { eligible: "Potentially", reasoning: "AI Analysis failed. Please review manually." };
  }
};

export const extractPatientFromText = async (rawText: string): Promise<any> => {
  try {
    const ai = getAiClient();
    const modelId = 'gemini-2.5-flash';
    const prompt = `
      Extract patient demographic and clinical data from the following referral text.
      Infer missing fields where possible (e.g. calculate DOB from age if needed, or leave null).
      
      TEXT:
      ${rawText}

      Return JSON matching this structure:
      {
        "firstName": string,
        "lastName": string,
        "dateOfBirth": string (YYYY-MM-DD format, estimate if only age is given),
        "gender": "Male", "Female", or "Other",
        "address": string (optional),
        "medicalHistorySummary": string (summarize relevant history)
      }
    `;

    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
         responseSchema: {
          type: Type.OBJECT,
          properties: {
            firstName: { type: Type.STRING },
            lastName: { type: Type.STRING },
            dateOfBirth: { type: Type.STRING },
            gender: { type: Type.STRING, enum: ["Male", "Female", "Other"] },
            address: { type: Type.STRING },
            medicalHistorySummary: { type: Type.STRING }
          }
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    return JSON.parse(text);

  } catch (error) {
    console.error("AI Extraction Failed:", error);
    return null;
  }
};

export const extractPatientFromImage = async (base64Image: string): Promise<any> => {
  try {
    const ai = getAiClient();
    // Remove data URL header if present
    const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, "");
    
    const modelId = 'gemini-2.5-flash'; 
    const prompt = `
      You are an expert OCR system specializing in Identity Documents (Driver's Licenses, ID Cards).
      Extract the patient demographic data with high precision.

      CRITICAL RULES:
      1. "Given Name" or "First Name" often includes the Middle Name on IDs. If you see multiple names in the First Name field (e.g., "JOHN QUINCY"), split them:
         - firstName: "JOHN"
         - middleName: "QUINCY"
      2. "Surname" is the Last Name.
      3. DATE OF BIRTH (DOB) is distinct from Expiration Date (EXP) or Issue Date (ISS). Look for "DOB", "Date of Birth", or birth dates (years like 19XX or 20XX).
      4. Parse dates into YYYY-MM-DD format.

      Return JSON matching this structure:
      {
        "firstName": string,
        "middleName": string (optional),
        "lastName": string,
        "dateOfBirth": string (YYYY-MM-DD format),
        "gender": "Male", "Female", or "Other" (infer from name/photo if not explicit),
        "address": string (optional)
      }
    `;

    const response = await ai.models.generateContent({
      model: modelId,
      contents: {
        parts: [
          { inlineData: { mimeType: "image/jpeg", data: base64Data } },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
            type: Type.OBJECT,
            properties: {
              firstName: { type: Type.STRING },
              middleName: { type: Type.STRING },
              lastName: { type: Type.STRING },
              dateOfBirth: { type: Type.STRING },
              gender: { type: Type.STRING, enum: ["Male", "Female", "Other"] },
              address: { type: Type.STRING }
            }
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    return JSON.parse(text);

  } catch (error) {
    console.error("AI Image Extraction Failed:", error);
    return null;
  }
};

export const extractStudyFromProtocol = async (protocolText: string): Promise<any> => {
  try {
    const ai = getAiClient();
    const modelId = 'gemini-2.5-flash';
    const prompt = `
      Analyze the following clinical trial protocol text and extract the key study details.
      
      PROTOCOL TEXT:
      ${protocolText.substring(0, 30000)} // Limit context window if file is huge
      
      Return a JSON object with:
      - protocolNumber
      - title
      - phase ("I", "II", "III", or "IV")
      - sponsor
      - description (short summary)
      - inclusionCriteria (as a formatted list string)
      - exclusionCriteria (as a formatted list string)
      - recruitmentTarget (estimate a number if found, else default 100)
    `;

    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            protocolNumber: { type: Type.STRING },
            title: { type: Type.STRING },
            phase: { type: Type.STRING, enum: ["I", "II", "III", "IV"] },
            sponsor: { type: Type.STRING },
            description: { type: Type.STRING },
            inclusionCriteria: { type: Type.STRING },
            exclusionCriteria: { type: Type.STRING },
            recruitmentTarget: { type: Type.INTEGER },
          }
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    return JSON.parse(text);

  } catch (error) {
    console.error("AI Protocol Extraction Failed:", error);
    return null;
  }
};
