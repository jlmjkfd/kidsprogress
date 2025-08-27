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
    if (!input.trim()) return;

    const userMsg: Message = {
      role: ChatRole.USER,
      content: input,
      type: ChatType.TEXT,
    };

    dispatch(pushMessage(userMsg));
    setInput("");

    const res = await axios.post(`${apiBaseUrl}/chat`, userMsg);
    console.log(res.data);
    const aiMsg = res.data.AIMsg as Message;
    console.log("aiMsg:", aiMsg);
    dispatch(pushMessage(aiMsg));
  };

  useEffect(() => {
    dispatch(fetchMessages());
  }, [dispatch]);

  return (
    <div className="h-screen flex flex-col bg-gradient-to-b from-indigo-50 via-purple-50 to-pink-50">
      {/* Chat Header */}
      <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white p-4 shadow-lg">
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
              Hi there!
            </h3>
            <p className="text-gray-600 max-w-xs">
              I'm your AI helper! Ask me about your writing, or just say hello.
              I'm here to help you learn and grow! 📚✨
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
      <div className="bg-white border-t-4 border-purple-200 p-4 shadow-lg">
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <div className="relative">
              <textarea
                className="w-full border-2 border-purple-200 rounded-2xl px-4 py-3 pr-12 resize-none focus:border-purple-400 focus:ring-2 focus:ring-purple-200 focus:outline-none transition-all duration-200 placeholder-gray-400"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask me anything about writing! 🤔💭"
                rows={1}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                style={{
                  minHeight: "48px",
                  maxHeight: "120px",
                  resize: "none",
                }}
              />
              <div className="absolute right-3 top-3 text-gray-400">
                <span className="text-lg">💬</span>
              </div>
            </div>
          </div>
          <button
            onClick={sendMessage}
            disabled={!input.trim()}
            className={`
              px-6 py-3 rounded-2xl font-semibold transition-all duration-200 transform
              flex items-center space-x-2 min-w-[100px] justify-center
              ${
                input.trim()
                  ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg hover:shadow-xl hover:scale-105 active:scale-95"
                  : "bg-gray-200 text-gray-400 cursor-not-allowed"
              }
            `}
          >
            <span>Send</span>
            <span className="text-lg">🚀</span>
          </button>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex gap-2 mt-3 flex-wrap">
          <button
            onClick={() => setInput("What's my overall writing progress?")}
            className="bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 px-3 py-1 rounded-full text-sm hover:from-blue-200 hover:to-indigo-200 transition-all duration-200 transform hover:scale-105"
          >
            📊 My Progress
          </button>
          <button
            onClick={() => setInput("How can I improve my writing?")}
            className="bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 px-3 py-1 rounded-full text-sm hover:from-green-200 hover:to-emerald-200 transition-all duration-200 transform hover:scale-105"
          >
            🎯 Get Tips
          </button>
          <button
            onClick={() => setInput("Tell me about my recent writing")}
            className="bg-gradient-to-r from-yellow-100 to-orange-100 text-orange-700 px-3 py-1 rounded-full text-sm hover:from-yellow-200 hover:to-orange-200 transition-all duration-200 transform hover:scale-105"
          >
            📝 Recent Work
          </button>
        </div>
      </div>
    </div>
  );
}
export default ChatWindow;
// export type { Message };
