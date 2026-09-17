import React, { useState, useRef, useEffect } from "react";
import { MessageSquare, X, Send, Bot, User, Loader2 } from "lucide-react";
import { api } from "@/services/api";

interface Message {
  role: "user" | "model";
  content: string;
}

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "model", content: "Hi! I'm CampusTrack AI. I can tell you where the buses are. How can I help?" }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg = input.trim();
    setInput("");
    
    // Add user message to UI
    const newMessages: Message[] = [...messages, { role: "user", content: userMsg }];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      // Send history (excluding the very first greeting if it's too generic, or just send everything)
      const reply = await api.sendChatMessage(userMsg, newMessages.slice(0, -1));
      setMessages((prev) => [...prev, { role: "model", content: reply }]);
    } catch (error) {
      console.error(error);
      setMessages((prev) => [...prev, { role: "model", content: "Oops, something went wrong connecting to the AI. Is the server running?" }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 bg-blue-600 hover:bg-blue-500 text-white p-4 rounded-full shadow-lg shadow-blue-900/50 transition-all hover:scale-105 z-50 flex items-center justify-center"
      >
        <MessageSquare className="w-6 h-6" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-full max-w-[350px] h-[500px] max-h-[80vh] bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl shadow-black/50 flex flex-col z-50 overflow-hidden text-sm">
      {/* Header */}
      <div className="bg-blue-600 p-3 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-2 text-white">
          <Bot className="w-5 h-5" />
          <span className="font-semibold">CampusTrack AI</span>
        </div>
        <button onClick={() => setIsOpen(false)} className="text-white/80 hover:text-white">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-950/50 scrollbar-thin scrollbar-thumb-slate-700">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === "user" ? "bg-slate-700" : "bg-blue-600/20 text-blue-400"}`}>
              {msg.role === "user" ? <User className="w-4 h-4 text-slate-300" /> : <Bot className="w-4 h-4" />}
            </div>
            <div className={`px-4 py-2 rounded-2xl max-w-[75%] ${msg.role === "user" ? "bg-blue-600 text-white rounded-tr-none" : "bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700"}`}>
              <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-2 flex-row">
            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-blue-600/20 text-blue-400">
              <Bot className="w-4 h-4" />
            </div>
            <div className="px-4 py-3 rounded-2xl bg-slate-800 rounded-tl-none border border-slate-700 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
              <span className="text-slate-400 text-xs font-medium">Thinking...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-3 bg-slate-900 border-t border-slate-800">
        <div className="flex items-end gap-2 bg-slate-950 rounded-xl p-1 pr-2 border border-slate-700 focus-within:border-blue-500/50 focus-within:ring-1 focus-within:ring-blue-500/50 transition-all">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about a bus..."
            className="w-full bg-transparent text-white placeholder-slate-500 p-2 outline-none resize-none max-h-32 min-h-[40px] text-sm"
            rows={1}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="p-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg transition-colors shrink-0 mb-0.5"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
