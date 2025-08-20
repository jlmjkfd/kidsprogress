import { useEffect, useRef, useState } from "react";
import axios from "axios";
// import { v4 as uuid } from "uuid";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "../../store";
import { pushMessage, fetchMessages } from "../../store/modules/messagesSlice";
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
    <div className="h-screen flex flex-col">
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 space-y-4"
      >
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
      </div>
      <div className="flex p-4 border-t gap-2">
        <textarea
          className="flex-1 border rounded px-4 py-2 resize-none"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask something..."
        />
        <button
          onClick={sendMessage}
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          Send
        </button>
      </div>
    </div>
  );
}
export default ChatWindow;
// export type { Message };
