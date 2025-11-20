import { GoogleGenAI, Modality } from "@google/genai";

/**
 * Gemini helpers for image generation & editing.
 *
 * Notes:
 * - Prefer GOOGLE_API_KEY; accept API_KEY as legacy alias.
 * - Keep this helper file (requested) but main flow uses REST in route handler.
 */
const API_KEY = process.env.GOOGLE_API_KEY || process.env.API_KEY;
const ai = API_KEY ? new GoogleGenAI({ apiKey: API_KEY }) : undefined;

/**
 * Edit an image with a text instruction using Gemini 2.5 Flash Image.
 */
export const editImageWithGemini = async (
  base64Data: string,
  mimeType: string,
  prompt: string
): Promise<string> => {
  if (!ai) throw new Error("Thiếu GOOGLE_API_KEY/API_KEY cho Gemini");
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Data,
              mimeType,
            },
          },
          { text: prompt },
        ],
      },
      config: { responseModalities: [Modality.IMAGE] },
    });

    // Extract the generated image from the response
    const part = response.candidates?.[0]?.content?.parts?.[0];
    if (part && part.inlineData?.data) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
    throw new Error("No image data returned from the model.");
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};

/**
 * Generate images from a text prompt using Google GenAI SDK via ai.models.generateContent.
 * Returns data URLs (data:image/png;base64,...)
 */
export async function generateImagesViaGemini(
  prompt: string,
  count: number,
  aspectRatio: string = "9:16",
  apiKey?: string,
  modelId?: string
): Promise<string[]> {
  const key = apiKey || process.env.GOOGLE_API_KEY || process.env.API_KEY;
  if (!key) throw new Error("Thiếu GOOGLE_API_KEY cho Gemini image generation");

  // Prefer an image-capable Gemini model for generateContent
  const desiredModel = modelId || process.env.GEMINI_IMAGE_MODEL || "gemini-2.5-flash-image";
  const model = /imagegeneration/i.test(desiredModel) ? "gemini-2.5-flash-image" : desiredModel;

  // Create a client (reuse module client if compatible, otherwise create scoped)
  const client = apiKey ? new GoogleGenAI({ apiKey: key }) : ai;
  if (!client) throw new Error("Không khởi tạo được GoogleGenAI client");

  const images: string[] = [];
  const total = Math.max(1, Math.min(6, Number(count) || 1));

  // Strengthen prompt with aspect ratio hint to guide composition
  const promptWithHints = [
    prompt,
    `\n\nYêu cầu định dạng hình ảnh: tỷ lệ khung hình ${aspectRatio}. Trả về trực tiếp hình ảnh chất lượng cao, phù hợp dùng làm slide ứng dụng.`,
  ].join("");

  async function generateOne(currentModel: string): Promise<string | null> {
    try {
      const response = await client.models.generateContent({
        model: currentModel,
        contents: [
          {
            role: "user",
            parts: [{ text: promptWithHints }],
          },
        ],
        // Ask explicitly for image output
        config: { responseModalities: [Modality.IMAGE] },
      });

      const parts = (response as any)?.candidates?.[0]?.content?.parts || [];
      const imgPart = parts.find((p: any) => p?.inlineData?.data);
      const dataB64 = imgPart?.inlineData?.data || parts?.[0]?.inlineData?.data;
      if (dataB64) {
        // Default to PNG if mime is missing
        const mime = imgPart?.inlineData?.mimeType || "image/png";
        return `data:${mime};base64,${dataB64}`;
      }
      return null;
    } catch (err) {
      // Surface but don't throw to allow fallback attempts
      console.warn("Gemini generateContent image error:", err);
      return null;
    }
  }

  for (let i = 0; i < total; i++) {
    let img = await generateOne(model);
    if (!img && model !== "gemini-2.5-flash-image") {
      // Fallback to a known image-capable model
      img = await generateOne("gemini-2.5-flash-image");
    }
    if (img) images.push(img);
  }

  return images;
}