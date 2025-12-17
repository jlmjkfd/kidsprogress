/**
 * Child Portal Chat Page - AI chat assistant for kids
 */
import { useState, useRef, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  IconSend,
  IconTrash,
  IconRobot,
  IconUser,
  IconSparkles,
} from "@tabler/icons-react";
import LoadingSpinner from "@/components/LoadingSpinner";
import { useChatHistory, ChatMessage } from "@/api/queries/useChatHistory";
import { useSendMessage, useClearChat } from "@/api/mutations/useChatMutations";

// Chat bubble component
function ChatBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

  // Format timestamp to local time (backend stores UTC)
  const formatTime = (timestamp: string) => {
    // Append Z if not present to indicate UTC
    const utcTimestamp = timestamp.endsWith("Z") ? timestamp : timestamp + "Z";
    const date = new Date(utcTimestamp);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
      {/* Avatar */}
      <div
        className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${
          isUser
            ? "bg-blue-100 text-blue-600"
            : "bg-gradient-to-br from-purple-500 to-pink-500 text-white"
        }`}
      >
        {isUser ? <IconUser size={20} /> : <IconRobot size={20} />}
      </div>

      {/* Message bubble */}
      <div
        className={`max-w-[75%] rounded-2xl px-4 py-3 ${
          isUser
            ? "rounded-br-md bg-blue-600 text-white"
            : "rounded-bl-md border border-gray-100 bg-white text-gray-800 shadow-sm"
        }`}
      >
        {isUser ? (
          // User messages: plain text
          <p className="text-sm whitespace-pre-wrap sm:text-base">
            {message.content}
          </p>
        ) : (
          // AI messages: markdown support
          <div className="prose prose-sm sm:prose-base max-w-none prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5 prose-headings:my-2 prose-code:text-purple-600 prose-code:bg-purple-50 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-pre:bg-gray-100 prose-pre:text-gray-800 prose-a:text-blue-600 prose-strong:text-gray-900">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {message.content}
            </ReactMarkdown>
          </div>
        )}
        <p
          className={`mt-1 text-xs ${
            isUser ? "text-blue-200" : "text-gray-400"
          }`}
        >
          {formatTime(message.timestamp)}
        </p>
      </div>
    </div>
  );
}

// Typing indicator
function TypingIndicator() {
  return (
    <div className="flex gap-3">
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-pink-500 text-white">
        <IconRobot size={20} />
      </div>
      <div className="rounded-2xl rounded-bl-md border border-gray-100 bg-white px-4 py-3 shadow-sm">
        <div className="flex gap-1">
          <span
            className="h-2 w-2 animate-bounce rounded-full bg-gray-400"
            style={{ animationDelay: "0ms" }}
          />
          <span
            className="h-2 w-2 animate-bounce rounded-full bg-gray-400"
            style={{ animationDelay: "150ms" }}
          />
          <span
            className="h-2 w-2 animate-bounce rounded-full bg-gray-400"
            style={{ animationDelay: "300ms" }}
          />
        </div>
      </div>
    </div>
  );
}

export default function ChildChatPage() {
  const { childId } = useParams<{ childId: string }>();
  const { t, i18n } = useTranslation(["chat", "common"]);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: messages, isLoading } = useChatHistory(childId || "");
  const sendMessageMutation = useSendMessage(childId || "");
  const clearChatMutation = useClearChat(childId || "");

  // Get current language (en, zh, etc.)
  const currentLanguage = i18n.language?.split("-")[0] || "en";

  // Filter out system messages for display
  const displayMessages = messages?.filter((m) => m.role !== "system") || [];

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [displayMessages.length, sendMessageMutation.isPending]);

  const handleSend = async () => {
    const trimmedInput = input.trim();
    if (!trimmedInput || sendMessageMutation.isPending) return;

    setInput("");
    await sendMessageMutation.mutateAsync({
      message: trimmedInput,
      language: currentLanguage,
    });
    inputRef.current?.focus();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClear = async () => {
    if (window.confirm(t("chat:confirm_clear"))) {
      await clearChatMutation.mutateAsync();
    }
  };

  if (isLoading) {
    return <LoadingSpinner size="lg" />;
  }

  return (
    <div className="flex h-full flex-col bg-gradient-to-br from-purple-50 to-pink-50">
      {/* Header */}
      <div className="flex flex-shrink-0 items-center justify-between border-b bg-white/90 px-4 py-3 backdrop-blur-sm sm:px-6 md:px-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-pink-500">
            <IconSparkles size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold text-gray-900 sm:text-lg">{t("chat:title")}</h1>
            <p className="text-xs text-gray-500">{t("chat:subtitle")}</p>
          </div>
        </div>
        {displayMessages.length > 0 && (
          <button
            onClick={handleClear}
            disabled={clearChatMutation.isPending}
            className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
            title={t("chat:clear_chat")}
          >
            <IconTrash size={20} />
          </button>
        )}
      </div>

      {/* Messages area */}
      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-6 md:px-8">
        {displayMessages.length === 0 ? (
          <div className="py-12 text-center">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-pink-500">
              <IconRobot size={40} className="text-white" />
            </div>
            <h2 className="mb-2 text-xl font-bold text-gray-900">
              {t("chat:welcome_title")}
            </h2>
            <p className="mx-auto max-w-sm text-gray-500">
              {t("chat:welcome_message")}
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {[
                "chat:suggestion_1",
                "chat:suggestion_2",
                "chat:suggestion_3",
              ].map((key) => (
                <button
                  key={key}
                  onClick={() => setInput(t(key))}
                  className="rounded-full border border-purple-200 bg-white px-4 py-2 text-sm text-purple-600 transition-colors hover:bg-purple-50"
                >
                  {t(key)}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {displayMessages.map((message, index) => (
              <ChatBubble key={index} message={message} />
            ))}
            {sendMessageMutation.isPending && <TypingIndicator />}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="sticky bottom-0 border-t bg-white px-4 py-3 sm:px-6 md:px-8">
        <div className="mx-auto flex max-w-3xl gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder={t("chat:input_placeholder")}
            disabled={sendMessageMutation.isPending}
            className="flex-1 rounded-full border border-gray-200 px-4 py-3 text-sm focus:border-transparent focus:ring-2 focus:ring-purple-500 focus:outline-none sm:text-base"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || sendMessageMutation.isPending}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white transition-shadow hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
          >
            <IconSend size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
