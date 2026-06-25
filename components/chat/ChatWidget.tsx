"use client";

import { useState } from "react";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChatPanel } from "./ChatPanel";

export function ChatWidget() {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {open ? (
        <ChatPanel onClose={() => setOpen(false)} />
      ) : (
        <Button size="icon-lg" className="rounded-full shadow-lg" onClick={() => setOpen(true)}>
          <MessageCircle />
        </Button>
      )}
    </div>
  );
}
