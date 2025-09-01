import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "../../store";
import {
  addMessage,
  removeMessageByTempId,
  fetchMessages,
  sendMessage,
} from "../../store/modules/chatSlice";
import { ChatRole, ChatType } from "../../utils/constants";
import { Message } from "../../models/Message";
import { generateTempId, MessageStatus } from "../../utils/messageUtils";
import { ChatFormType } from "../../utils/constants";
import AIThinkingAnimation from "./AIThinkingAnimation";
import WritingProgressAnimation from "./WritingProgressAnimation";
import MathProgressAnimation from "./MathProgressAnimation";
import MessageRenderer from "./MessageRenderer";
import { useTheme } from "../../contexts/ThemeContext";

//const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

function ChatWindow() {
  const [input, setInput] = useState("");
  const { currentTheme } = useTheme();

  const containerRef = useRef<HTMLDivElement>(null);

  const dispatch = useDispatch<AppDispatch>();
  const { messages, hasMore, loading } = useSelector(
    (state: RootState) => state.messages
  );

  // Check if any message is currently sending
  const isSending = messages.some(
    (msg) => msg.status === MessageStatus.SENDING
  );

  // Get the most recent sending message to determine animation type
  const sendingMessage = messages.find(
    (msg) => msg.status === MessageStatus.SENDING
  );
  const isWritingWorkflow = sendingMessage?.formType === ChatFormType.WRITING;
  const isMathWorkflow = sendingMessage?.formType === ChatFormType.MATH;

  // const fetchMessages = async (initial = false) => {
  //   if (loading || (!hasMore && !initial)) return;

  //   setLoading(true);
  //   // const res = await axios.get("/api/messages", {
  //   //   params: { offset: offsetRef.current, limit: 20 },
  //   // });
  //   // const res = {
  //   //   data: [
  //   //     { id: "33", role: "user", content: "fetched1", type: ChatType.TEXT },
  //   //     {
  //   //       id: "44",
  //   //       role: "ai",
  //   //       content: "fetched ai message",
  //   //       type: ChatType.TEXT,
  //   //     },
  //   //   ],
  //   // };
  //   if (res.data.length < 20) setHasMore(false);
  //   offsetRef.current += res.data.length;
  //   dispatch(loadMoreMessages(res.data as Message[]));
  //   setLoading(false);
  // };

  const handleScroll = () => {
    if (containerRef.current?.scrollTop === 0) {
      //fetchMessages();
      if (!hasMore || loading) return;
      const earliest = messages[0]?.date;
      if (earliest) {
        dispatch(fetchMessages(earliest.toString()));
      }
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim() || isSending) return;

    // Generate temporary ID for optimistic UI
    const tempId = generateTempId();

    const userMsg: Message = {
      tempId,
      role: ChatRole.USER,
      content: input,
      type: ChatType.TEXT,
      status: MessageStatus.SENDING,
      date: new Date(),
    };

    // Add message immediately to UI (optimistic update)
    dispatch(addMessage(userMsg));
    setInput("");

    // Send message to server with temp ID handling
    dispatch(sendMessage({ tempId, message: userMsg }));
  };

  const handleRetryMessage = (tempId: string, originalMessage: Message) => {
    // Remove failed message
    dispatch(removeMessageByTempId(tempId));

    // Generate new temp ID and resend
    const newTempId = generateTempId();
    const retryMessage: Message = {
      ...originalMessage,
      tempId: newTempId,
      status: MessageStatus.SENDING,
      error: undefined,
      retryable: false,
    };

    dispatch(addMessage(retryMessage));
    dispatch(sendMessage({ tempId: newTempId, message: retryMessage }));
  };

  useEffect(() => {
    dispatch(fetchMessages());
  }, [dispatch]);

  // Auto-scroll to bottom when sending or when animations appear
  useEffect(() => {
    if (isSending && containerRef.current) {
      setTimeout(() => {
        containerRef.current?.scrollTo({
          top: containerRef.current.scrollHeight,
          behavior: "smooth",
        });
      }, 100);
    }
  }, [isSending]);

  return (
    <div className={`h-full flex flex-col bg-gradient-to-b ${currentTheme.colors.gradients.background}`}>
      {/* Chat Header - Only show on mobile or when not embedded */}
      <div className={`xl:hidden bg-gradient-to-r ${currentTheme.colors.gradients.primary} text-white p-4 shadow-lg`}>
        <div className="flex items-center space-x-2">
          <span className="text-2xl">🤖</span>
          <div>
            <h3 className="font-bold text-lg">AI Helper</h3>
            <p className="text-purple-100 text-sm">Ready to help you learn!</p>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-purple-300 scrollbar-track-transparent"
      >
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="text-6xl mb-4">🌟</div>
            <h3 className="text-xl font-bold text-purple-600 mb-2">
              Start a conversation!
            </h3>
            <p className="text-gray-600 max-w-xs">
              Ask me anything about your learning journey
            </p>
          </div>
        )}

        {messages.map((msg: Message) => {
          // Use tempId as fallback for key to handle optimistic updates
          const messageKey = msg._id || msg.tempId || `msg-${Date.now()}`;

          return (
            <MessageRenderer
              key={messageKey}
              message={msg}
              messageKey={messageKey}
              onRetry={handleRetryMessage}
            />
          );
        })}

        {/* Enhanced AI Thinking Animations */}
        {isSending && (
          <div className="my-6">
            {isWritingWorkflow ? (
              <WritingProgressAnimation />
            ) : isMathWorkflow ? (
              <MathProgressAnimation />
            ) : (
              <AIThinkingAnimation
                workflowType="general"
                formType={sendingMessage?.formType}
              />
            )}
          </div>
        )}

        {/* Loading animation for fetching old messages */}
        {loading && !isSending && (
          <div className="flex justify-center my-4">
            <div className="bg-white rounded-full px-4 py-2 shadow-lg flex items-center space-x-2">
              <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"></div>
              <div
                className="w-2 h-2 bg-pink-400 rounded-full animate-bounce"
                style={{ animationDelay: "0.1s" }}
              ></div>
              <div
                className="w-2 h-2 bg-orange-400 rounded-full animate-bounce"
                style={{ animationDelay: "0.2s" }}
              ></div>
              <span className="text-sm text-gray-600 ml-2">
                Loading messages...
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="bg-white border-t border-gray-200 p-3 shadow-lg flex-shrink-0">
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <input
              type="text"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-colors duration-200 placeholder-gray-500 text-sm"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message..."
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
            />
          </div>
          <button
            onClick={handleSendMessage}
            disabled={!input.trim() || isSending}
            className={`
              px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200
              ${
                input.trim() && !isSending
                  ? "bg-blue-500 text-white hover:bg-blue-600 active:bg-blue-700"
                  : "bg-gray-200 text-gray-400 cursor-not-allowed"
              }
            `}
          >
            {isSending ? "Sending..." : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}
export default ChatWindow;
// export type { Message };
