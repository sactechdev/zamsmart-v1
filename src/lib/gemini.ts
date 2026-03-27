import { GoogleGenAI } from "@google/genai";

const getAI = () => {
  const apiKey = process.env.GEMINI_API_KEY || "";
  if (!apiKey) {
    console.warn("GEMINI_API_KEY is missing. Background removal will not work.");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

export async function removeBackground(imageUrl: string): Promise<string> {
  const ai = getAI();
  if (!ai) {
    throw new Error("Gemini API key is not configured. Please add it to your environment variables.");
  }

  try {
    // Fetch the image
    const response = await fetch(imageUrl);
    const blob = await response.blob();
    
    // Convert blob to base64
    const base64Data = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });

    const base64Content = base64Data.split(',')[1];
    const mimeType = blob.type;

    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Content,
              mimeType: mimeType,
            },
          },
          {
            text: "Remove the background from this image. Return only the main object on a transparent background. Output the result as an image.",
          },
        ],
      },
    });

    for (const part of result.candidates[0].content.parts) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }

    throw new Error("No image returned from Gemini");
  } catch (error) {
    console.error("Error removing background:", error);
    throw error;
  }
}
