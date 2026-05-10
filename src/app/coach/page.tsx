"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Loader2, Bot, User } from "lucide-react";
import { GoogleGenerativeAI } from "@google/generative-ai";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const SYSTEM_PROMPT = `Tu es FUEL Coach, un assistant nutritionnel personnel expert et bienveillant. Tu aides l'utilisateur à :
- Atteindre ses objectifs nutritionnels (2200 kcal/jour, 180g protéines)
- Optimiser son alimentation
- Répondre à ses questions sur la nutrition et la musculation
- Donner des conseils pratiques et personnalisés

Réponds de manière concise et directe. Utilise le français. Tu peux utiliser quelques emojis pour rendre la conversation plus agréable.`;

export default function CoachPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Salut ! 👋 Je suis ton FUEL Coach. Pose-moi toutes tes questions sur la nutrition, les macros, ou tes objectifs. Je suis là pour t'aider !",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMsg: Message = { role: "user", content: input.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY!);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      const history = messages.map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));

      const chat = model.startChat({
        history: [
          { role: "user", parts: [{ text: "Contexte : " + SYSTEM_PROMPT }] },
          { role: "model", parts: [{ text: "Compris, je suis FUEL Coach." }] },
          ...history,
        ],
      });

      const result = await chat.sendMessage(input.trim());
      const response = result.response.text();

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: response },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Désolé, une erreur est survenue. Réessaie ! 🔄",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100dvh-8rem)] animate-fade-in">
      <header className="mb-4">
        <h1 className="text-2xl font-bold text-white tracking-tight">
          Coach
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Ton assistant nutrition IA
        </p>
      </header>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto space-y-4 pb-4"
      >
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex gap-2.5 ${
              msg.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            {msg.role === "assistant" && (
              <div className="shrink-0 w-7 h-7 rounded-full bg-emerald-500/20 flex items-center justify-center mt-1">
                <Bot size={14} className="text-emerald-500" />
              </div>
            )}
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-emerald-600 text-white rounded-br-md"
                  : "bg-slate-800/80 text-slate-200 rounded-bl-md"
              }`}
            >
              {msg.content}
            </div>
            {msg.role === "user" && (
              <div className="shrink-0 w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center mt-1">
                <User size={14} className="text-slate-300" />
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex gap-2.5">
            <div className="shrink-0 w-7 h-7 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <Bot size={14} className="text-emerald-500" />
            </div>
            <div className="bg-slate-800/80 rounded-2xl rounded-bl-md px-4 py-3">
              <Loader2 size={16} className="animate-spin text-emerald-500" />
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 bg-slate-900/80 rounded-2xl border border-slate-800/50 p-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
          placeholder="Pose ta question..."
          className="flex-1 bg-transparent text-sm text-white placeholder-slate-500 outline-none py-2 px-2"
        />
        <button
          onClick={handleSend}
          disabled={loading || !input.trim()}
          className="p-2 text-emerald-500 disabled:text-slate-600 disabled:opacity-50 transition-colors"
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}
