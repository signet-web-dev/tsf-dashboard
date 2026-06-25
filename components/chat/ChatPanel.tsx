"use client";

import { useState, useRef, useEffect } from "react";
import { X, Send, Eraser } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { ConfirmationCard } from "./ConfirmationCard";
import type { PendingAction } from "@/lib/chat/pending-actions";

type DisplayMessage = {
  role: "user" | "assistant";
  content: string;
  pendingAction?: PendingAction | null;
  resolved?: "confirmed" | "cancelled";
};

const STORAGE_KEY = "tsf-chat-history";
// Each request resends the full history (the route is stateless) and Groq's free tier has a
// daily token cap, so only the most recent turns are sent - older messages stay visible in the
// panel but drop out of the model's context.
const MAX_HISTORY_SENT = 12;

export function ChatPanel({ onClose }: { onClose: () => void }) {
  const [messages, setMessages] = useState<DisplayMessage[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;

    const nextMessages: DisplayMessage[] = [...messages, { role: "user", content: text }];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages
            .slice(-MAX_HISTORY_SENT)
            .map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      const raw = await res.text();
      const data = raw ? JSON.parse(raw) : null;

      if (!res.ok || !data) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: res.status === 401 ? "You've been signed out — please log in again." : "Sorry, something went wrong." },
        ]);
        return;
      }

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.message ?? "",
          pendingAction: data.pendingAction ?? null,
        },
      ]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Sorry, something went wrong." }]);
    } finally {
      setLoading(false);
    }
  }

  function clearChat() {
    setMessages([]);
    sessionStorage.removeItem(STORAGE_KEY);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <Card className="fixed bottom-20 right-4 z-50 flex h-[560px] w-[380px] flex-col">
      <CardHeader className="flex-row items-center justify-between border-b">
        <CardTitle>Dashboard Assistant</CardTitle>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            title="Clear chat"
            disabled={messages.length === 0}
            onClick={clearChat}
          >
            <Eraser />
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={onClose}>
            <X />
          </Button>
        </div>
      </CardHeader>
      <CardContent ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto py-3">
        {messages.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Ask about sales, ad spend, or say something like &ldquo;Add customer XYZ — bought 1L Groundnut
            oil&rdquo;.
          </p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={cn("flex flex-col gap-2", m.role === "user" ? "items-end" : "items-start")}>
            {m.content && (
              <div
                className={cn(
                  "max-w-[85%] rounded-lg px-3 py-2 text-sm",
                  m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
                )}
              >
                {m.content}
              </div>
            )}
            {m.pendingAction && !m.resolved && (
              <ConfirmationCard
                action={m.pendingAction}
                onResolved={(outcome, resultMessage) =>
                  setMessages((prev) =>
                    prev.map((msg, idx) =>
                      idx === i ? { ...msg, resolved: outcome, content: resultMessage } : msg
                    )
                  )
                }
              />
            )}
          </div>
        ))}
        {loading && <p className="text-sm text-muted-foreground">Thinking…</p>}
      </CardContent>
      <CardFooter className="gap-2">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask a question or record an order…"
          className="min-h-9"
          disabled={loading}
        />
        <Button size="icon" disabled={loading || !input.trim()} onClick={send}>
          <Send />
        </Button>
      </CardFooter>
    </Card>
  );
}
