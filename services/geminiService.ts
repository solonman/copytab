
import { GoogleGenAI } from "@google/genai";

let ai: GoogleGenAI | null = null;

try {
  // Always use process.env.API_KEY as per guidelines.
  // The app should handle cases where this might not be set.
  if (process.env.API_KEY) {
    ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  } else {
    console.warn("Gemini API key not found in process.env.API_KEY. AI features will be disabled.");
  }
} catch (e) {
  console.error("Failed to initialize GoogleGenAI:", e);
}


// 模拟用于语义搜索的RAG数据
const MOCK_DOCUMENT_CHUNKS = [
    "我们的夏季系列旨在挣脱束缚，拥抱阳光。",
    "采用轻质面料和透气设计，让您在炎炎夏日保持凉爽与时尚。",
    "GadgetPro X 专为追求极致的专业人士打造。",
    "其直观的界面和强大的处理器可简化您的工作流程。",
    "简约，不简单，是我们的核心设计理念。",
];

// 此函数模拟整个后端流程以进行性能优化。
// 在实际应用中，这将是一个无服务器函数。
async function* getSemanticSuggestion(prompt: string, rewrite: boolean): AsyncGenerator<string> {
    // 阶段1: 快速向量搜索 (模拟)
    // 从模拟知识库中找到最相关的文本块。
    // 这部分在后端会是一个 pgvector 查询，速度非常快。
    const relevantChunk = MOCK_DOCUMENT_CHUNKS.find(chunk =>
        prompt.toLowerCase().includes(chunk.slice(0, 5).toLowerCase()) 
    ) || MOCK_DOCUMENT_CHUNKS[0];
    
    if (!rewrite) {
        // 如果关闭了改写模式，直接返回找到的原始文本块。
        yield relevantChunk;
        return;
    }

    if (!ai) {
        yield " (AI 服务未配置)";
        return;
    }

    // 阶段 2: 使用 LLM 异步生成
    // 这部分可能较慢, 因此我们使用流式响应。
    const fullPrompt = `根据以下上下文，续写用户的句子。请直接续写，不要重复用户已输入的内容。
    上下文: "${relevantChunk}"
    用户的句子: "${prompt}"
    
    续写:`;
    
    try {
        const responseStream = await ai.models.generateContentStream({
            model: "gemini-2.5-flash",
            contents: fullPrompt,
        });

        for await (const chunk of responseStream) {
            yield chunk.text;
        }
    } catch (e) {
        console.error(e);
        yield " [AI 生成时出错]";
    }
}


export async function* getCompletionStream(currentText: string, rewriteMode: boolean): AsyncGenerator<string> {
    // 在这个简化的前端版本中, 我们只调用语义建议。
    // 逐字补全建议在 Editor 组件中同步处理。
    const lastSentence = currentText.trim();
    if (lastSentence.length < 5) return;

    yield* getSemanticSuggestion(lastSentence, rewriteMode);
}