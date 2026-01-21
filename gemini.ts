
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";

// Initialize the Google GenAI client with the API key from environment variables
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const cache = {
  search: new Map<string, any>(),
  status: new Map<string, any>(),
  suggestions: new Map<string, string[]>(),
  schedules: new Map<string, any>(),
  coaches: new Map<string, any>(),
};

/**
 * Handles streaming responses for the Rail Concierge assistant.
 * Uses gemini-3-flash-preview as it is suitable for general Q&A.
 */
export const getRailAssistantResponseStream = async (query: string, onChunk: (text: string) => void) => {
  try {
    const responseStream = await ai.models.generateContentStream({
      model: 'gemini-3-flash-preview',
      contents: query,
      config: {
        systemInstruction: "You are RailBot, a helpful AI assistant for the 'TheRailTrain' app. Be extremely concise, polite, and accurate.",
        thinkingConfig: { thinkingBudget: 0 }
      },
    });

    let fullText = "";
    for await (const chunk of responseStream) {
      // Access text property directly as per SDK guidelines
      const text = (chunk as GenerateContentResponse).text;
      if (text) {
        fullText += text;
        onChunk(fullText);
      }
    }
    return fullText;
  } catch (error) {
    onChunk("I'm having trouble connecting right now. Please try again!");
    return "Error";
  }
};

/**
 * Fetches station suggestions with a structured JSON schema.
 */
export const getStationSuggestionsAI = async (query: string) => {
  if (!query || query.length < 2) return [];
  const cacheKey = query.toLowerCase();
  if (cache.suggestions.has(cacheKey)) return cache.suggestions.get(cacheKey) || [];

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `List 5 popular Indian railway stations matching "${query}".`,
      config: {
        thinkingConfig: { thinkingBudget: 0 },
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.STRING,
            description: "Station name and code in format 'Station (CODE)'"
          }
        }
      },
    });
    const results = JSON.parse(response.text || "[]");
    cache.suggestions.set(cacheKey, results);
    return results;
  } catch (error) {
    return [];
  }
};

/**
 * Retrieves coach sequence. Upgraded to gemini-3-pro-preview for complex logistics.
 */
export const getCoachPositionAI = async (trainNumber: string) => {
  if (cache.coaches.has(trainNumber)) return cache.coaches.get(trainNumber);

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `Provide the coach position sequence for train ${trainNumber} in India.`,
      config: {
        thinkingConfig: { thinkingBudget: 32768 },
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            trainName: { type: Type.STRING },
            coaches: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  code: { type: Type.STRING, description: "e.g., A1, B2, S3, GS" },
                  type: { type: Type.STRING, enum: ['engine', 'ac1', 'ac2', 'ac3', 'sleeper', 'general', 'pantry', 'luggage'] },
                  position: { type: Type.NUMBER }
                }
              }
            }
          },
          required: ["trainName", "coaches"]
        }
      }
    });
    const result = JSON.parse(response.text || "null");
    cache.coaches.set(trainNumber, result);
    return result;
  } catch (error) {
    return null;
  }
};

/**
 * Retrieves full train route schedule. Upgraded to gemini-3-pro-preview for logistics accuracy.
 */
export const getTrainScheduleAI = async (trainNumber: string) => {
  if (cache.schedules.has(trainNumber)) return cache.schedules.get(trainNumber);

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `Provide full route schedule for train ${trainNumber}. Include halt time (e.g. 5 min) and estimated platform number for each stop.`,
      config: {
        thinkingConfig: { thinkingBudget: 32768 },
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            trainName: { type: Type.STRING },
            stops: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  station: { type: Type.STRING },
                  arrivalTime: { type: Type.STRING },
                  departureTime: { type: Type.STRING },
                  haltTime: { type: Type.STRING },
                  platform: { type: Type.STRING },
                  day: { type: Type.NUMBER }
                }
              }
            }
          },
          required: ["trainName", "stops"]
        }
      }
    });
    const result = JSON.parse(response.text || "null");
    cache.schedules.set(trainNumber, result);
    return result;
  } catch (error) {
    return null;
  }
};

/**
 * Generates railway alerts.
 */
export const getRecentAlertsAI = async () => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: "Generate 4 realistic current Indian railway alerts (delays, platform changes, or weather impacts).",
      config: {
        thinkingConfig: { thinkingBudget: 0 },
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              type: { type: Type.STRING, enum: ['delay', 'cancellation', 'info'] },
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              time: { type: Type.STRING }
            }
          }
        }
      }
    });
    return JSON.parse(response.text || "[]");
  } catch (error) {
    return [];
  }
};

/**
 * Searches for trains between stations. Upgraded to gemini-3-pro-preview for complex retrieval.
 */
export const searchTrainsAI = async (from: string, to: string) => {
  const cacheKey = `${from.toLowerCase()}-${to.toLowerCase()}`;
  if (cache.search.has(cacheKey)) return cache.search.get(cacheKey);

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `Trains from ${from} to ${to}.`,
      config: {
        thinkingConfig: { thinkingBudget: 32768 },
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              number: { type: Type.STRING },
              name: { type: Type.STRING },
              source: { type: Type.STRING },
              destination: { type: Type.STRING },
              departureTime: { type: Type.STRING },
              arrivalTime: { type: Type.STRING },
            }
          }
        }
      }
    });
    const results = JSON.parse(response.text || "[]");
    cache.search.set(cacheKey, results);
    return results;
  } catch (error) {
    return [];
  }
};

/**
 * Fetches live status for a train.
 */
export const getLiveStatusAI = async (trainNumber: string) => {
  if (cache.status.has(trainNumber)) return cache.status.get(trainNumber);
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `Live status for ${trainNumber}.`,
      config: {
        thinkingConfig: { thinkingBudget: 32768 },
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            currentStation: { type: Type.STRING },
            status: { type: Type.STRING },
            delay: { type: Type.STRING },
            nextStations: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  station: { type: Type.STRING },
                  expectedTime: { type: Type.STRING },
                  platform: { type: Type.STRING }
                }
              }
            }
          }
        }
      }
    });
    const result = JSON.parse(response.text || "null");
    cache.status.set(trainNumber, result);
    return result;
  } catch (error) {
    return null;
  }
};
