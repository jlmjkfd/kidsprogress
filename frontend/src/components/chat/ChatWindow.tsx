import { useEffect, useRef, useState } from "react";
import axios from "axios";
// import { v4 as uuid } from "uuid";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "../../store";
import { pushMessage, fetchMessages } from "../../store/modules/chatSlice";
import { ChatRole, ChatType } from "../../utils/constants";
import { Message } from "../../models/Message";
import { formMessageMap } from "./MessageComponentMap";
import UserTextMessage from "./UserTextMessage";
import AiTextMessage from "./AiTextMessage";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

function ChatWindow() {
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  // const [messages, setMessages] = useState<Message[]>([]);
  // const [hasMore, setHasMore] = useState(true);
  // const [loading, setLoading] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  // const offsetRef = useRef(0);

  const dispatch = useDispatch<AppDispatch>();
  const { messages, hasMore, loading } = useSelector(
    (state: RootState) => state.messages
  );

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

  const sendMessage = async () => {
    if (!input.trim() || isSending) return;

    const userMsg: Message = {
      role: ChatRole.USER,
      content: input,
      type: ChatType.TEXT,
    };

    setIsSending(true);
    dispatch(pushMessage(userMsg));
    setInput("");

    try {
      const res = await axios.post(`${apiBaseUrl}/chat`, userMsg);
      console.log(res.data);
      const aiMsg = res.data.AIMsg as Message;
      console.log("aiMsg:", aiMsg);
      dispatch(pushMessage(aiMsg));
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsSending(false);
    }
  };

  useEffect(() => {
    dispatch(fetchMessages());
  }, [dispatch]);

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-indigo-50 via-purple-50 to-pink-50">
      {/* Chat Header - Only show on mobile or when not embedded */}
      <div className="xl:hidden bg-gradient-to-r from-purple-500 to-pink-500 text-white p-4 shadow-lg">
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
          if (msg.type === ChatType.TEXT) {
            return msg.role === ChatRole.USER ? (
              <UserTextMessage key={msg._id} msg={msg} />
            ) : (
              <AiTextMessage key={msg._id} msg={msg} />
            );
          } else {
            if (msg.role === ChatRole.USER) {
              const FormComp = formMessageMap[msg.formType][msg.role];
              return <FormComp key={msg._id} msg={msg} />;
            } else {
              const FormComp = formMessageMap[msg.formType][ChatRole.AI];
              return <FormComp key={msg._id} msg={msg} />;
            }
          }
        })}

        {loading && (
          <div className="flex justify-center">
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
                AI is thinking...
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
                  sendMessage();
                }
              }}
            />
          </div>
          <button
            onClick={sendMessage}
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
