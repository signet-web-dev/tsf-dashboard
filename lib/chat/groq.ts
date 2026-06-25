const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "llama-3.3-70b-versatile";

export type ChatMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
  name?: string;
};

export type ToolCall = {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
};

export type ToolDef = {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
};

export type GroqResponse = {
  choices: Array<{
    message: ChatMessage;
  }>;
};

export class GroqError extends Error {
  status: number;
  constructor(status: number, body: string) {
    super(`Groq error ${status}: ${body}`);
    this.status = status;
  }
}

export async function groqChat(messages: ChatMessage[], tools: ToolDef[]): Promise<GroqResponse> {
  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.GROQ_API_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      tools,
      tool_choice: "auto",
      temperature: 0.2,
    }),
  });

  if (!res.ok) {
    throw new GroqError(res.status, await res.text());
  }

  return res.json();
}
