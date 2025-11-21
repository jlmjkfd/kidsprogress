/**
 * Child Portal Chat Page - AI chat assistant for kids
 */
import { useState, useRef, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  IconSend,
  IconTrash,
  IconRobot,
  IconUser,
  IconLoader,
  IconSparkles,
} from "@tabler/icons-react";
import { useChatHistory, ChatMessage } from "@/api/queries/useChatHistory";
import { useSendMessage, useClearChat } from "@/api/mutations/useChatMutations";

// Chat bubble component
function ChatBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  const { t } = useTranslation(["chat"]);

  // Format timestamp to local time
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
      {/* Avatar */}
      <div
        className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
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
            ? "bg-blue-600 text-white rounded-br-md"
            : "bg-white text-gray-800 shadow-sm border border-gray-100 rounded-bl-md"
        }`}
      >
        <p className="text-sm sm:text-base whitespace-pre-wrap">{message.content}</p>
        <p
          className={`text-xs mt-1 ${
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
      <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-purple-500 to-pink-500 text-white">
        <IconRobot size={20} />
      </div>
      <div className="bg-white rounded-2xl rounded-bl-md px-4 py-3 shadow-sm border border-gray-100">
        <div className="flex gap-1">
          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
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
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <IconLoader className="animate-spin text-purple-600" size={48} />
      </div>
    );
  }

  return (
    <div className="absolute inset-0 flex flex-col bg-gradient-to-br from-purple-50 to-pink-50">
      {/* Header */}
      <div className="flex-shrink-0 bg-white/90 backdrop-blur-sm border-b px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <IconSparkles size={20} className="text-white" />
          </div>
          <div>
            <h1 className="font-bold text-gray-900">{t("chat:title")}</h1>
            <p className="text-xs text-gray-500">{t("chat:subtitle")}</p>
          </div>
        </div>
        {displayMessages.length > 0 && (
          <button
            onClick={handleClear}
            disabled={clearChatMutation.isPending}
            className="p-2 text-gray-400 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50"
            title={t("chat:clear_chat")}
          >
            <IconTrash size={20} />
          </button>
        )}
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {displayMessages.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mb-4">
              <IconRobot size={40} className="text-white" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              {t("chat:welcome_title")}
            </h2>
            <p className="text-gray-500 max-w-sm mx-auto">
              {t("chat:welcome_message")}
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {["chat:suggestion_1", "chat:suggestion_2", "chat:suggestion_3"].map(
                (key) => (
                  <button
                    key={key}
                    onClick={() => setInput(t(key))}
                    className="px-4 py-2 bg-white rounded-full text-sm text-purple-600 border border-purple-200 hover:bg-purple-50 transition-colors"
                  >
                    {t(key)}
                  </button>
                )
              )}
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
      <div className="sticky bottom-0 bg-white border-t px-4 py-3">
        <div className="flex gap-2 max-w-3xl mx-auto">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={t("chat:input_placeholder")}
            disabled={sendMessageMutation.isPending}
            className="flex-1 px-4 py-3 rounded-full border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm sm:text-base"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || sendMessageMutation.isPending}
            className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transition-shadow"
          >
            {sendMessageMutation.isPending ? (
              <IconLoader size={20} className="animate-spin" />
            ) : (
              <IconSend size={20} />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
