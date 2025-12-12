import { GoogleGenAI, Type } from "@google/genai";

export const analyzeShoeImage = async (base64Image: string): Promise<{ name: string; category: string; description: string }> => {
  if (!process.env.API_KEY) {
    console.warn("API Key missing, returning default values.");
    return {
      name: "新到货鞋品",
      category: "通用",
      description: "需要手动添加描述。"
    };
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // Clean base64 string if it contains metadata header
    const cleanBase64 = base64Image.split(',')[1] || base64Image;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: cleanBase64
            }
          },
          {
            text: "分析这张鞋子的图片。识别一个简短朗朗上口的产品名称（中文），类别（例如：运动鞋，靴子，高跟鞋，凉鞋），以及非常简短的描述（颜色，材质）。以 JSON 格式返回。"
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            category: { type: Type.STRING },
            description: { type: Type.STRING }
          },
          required: ["name", "category", "description"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from Gemini");

    return JSON.parse(text);
  } catch (error) {
    console.error("Error analyzing image with Gemini:", error);
    // Fallback on error
    return {
      name: "",
      category: "未知",
      description: ""
    };
  }
};