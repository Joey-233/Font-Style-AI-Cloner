
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

export class GeminiService {
  /**
   * Helper function for exponential backoff retry logic
   */
  private static async withRetry<T>(fn: () => Promise<T>, maxRetries = 3, initialDelay = 2000): Promise<T> {
    let lastError: any;
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn();
      } catch (error: any) {
        lastError = error;
        
        const errorStr = typeof error === 'string' ? error : JSON.stringify(error) || error.message || '';
        const isRetryable = 
          errorStr.includes('503') || 
          errorStr.toLowerCase().includes('overloaded') || 
          errorStr.includes('429') || 
          errorStr.toLowerCase().includes('rate limit');
        
        if (isRetryable && i < maxRetries - 1) {
          const delay = initialDelay * Math.pow(2, i);
          console.warn(`Gemini API is busy or overloaded (Attempt ${i + 1}/${maxRetries}). Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        throw error;
      }
    }
    throw lastError;
  }

  static async generateStyledText(
    styleRefBase64: string,
    fontTemplateBase64: string,
    targetText: string,
    useHighQuality: boolean = false,
    aspectRatio: string = "1:1",
    customApiKey?: string
  ): Promise<string> {
    return this.withRetry(async () => {
      // 优先使用用户输入的 Key，其次是环境变量
      const apiKey = customApiKey || process.env.API_KEY || '';
      if (!apiKey) {
        throw new Error("Missing API Key. Please configure it in settings.");
      }

      const ai = new GoogleGenAI({ apiKey });
      const model = useHighQuality ? 'gemini-3-pro-image-preview' : 'gemini-2.5-flash-image';
      
      const extractBase64 = (data: string) => data.split(',')[1] || data;
      const getMime = (data: string) => data.match(/data:([^;]+);/)?.[1] || 'image/png';

      const styleData = extractBase64(styleRefBase64);
      const styleMime = getMime(styleRefBase64);
      const fontData = extractBase64(fontTemplateBase64);
      const fontMime = getMime(fontTemplateBase64);

      const apiAspectRatioMap: Record<string, string> = {
        "1:1": "1:1",
        "4:3": "4:3",
        "3:2": "4:3",
        "16:9": "16:9",
        "2:1": "16:9"
      };
      const apiRatio = apiAspectRatioMap[aspectRatio] || "1:1";

      const prompt = `
        Task: Typography Style Transfer with Font Constraint.
        You are provided with two images:
        1. STYLE_REFERENCE: This image contains artistic text. Analyze its material, texture, 3D depth, lighting, and color palette.
        2. FONT_TEMPLATE: This image contains the text "${targetText}" in a specific font. It is white text on a black background.

        Your Goal:
        - Generate a NEW image of the text "${targetText}".
        - MANDATORY: Use the EXACT font shape, curves, and character proportions provided in the FONT_TEMPLATE.
        - APPLY the EXACT artistic style, material, and visual effects from the STYLE_REFERENCE to this font shape.
        - CRITICAL: THE TEXT MUST BE IN A SINGLE HORIZONTAL LINE. DO NOT WRAP OR SPLIT THE TEXT INTO MULTIPLE LINES.
        - The output must be centered on a SOLID, UNIFORM, PURE BLACK background (#000000).
        - Maintain the ${aspectRatio} aspect ratio.
        - Ensure the final result looks like a high-end graphic design asset.
      `;

      try {
        const response: GenerateContentResponse = await ai.models.generateContent({
          model: model,
          contents: {
            parts: [
              {
                inlineData: {
                  data: styleData,
                  mimeType: styleMime
                }
              },
              {
                inlineData: {
                  data: fontData,
                  mimeType: fontMime
                }
              },
              {
                text: prompt
              }
            ]
          },
          config: {
            imageConfig: {
              aspectRatio: apiRatio as any,
              imageSize: useHighQuality ? "1K" : undefined
            }
          }
        });

        let imageUrl = '';
        if (response.candidates && response.candidates[0].content.parts) {
          for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
              imageUrl = `data:image/png;base64,${part.inlineData.data}`;
              break;
            }
          }
        }

        if (!imageUrl) {
          throw new Error("No image data found in model response");
        }

        return imageUrl;
      } catch (error: any) {
        console.error("Gemini Generation Error:", error);
        throw error;
      }
    });
  }
}
