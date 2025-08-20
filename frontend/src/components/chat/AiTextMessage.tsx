import ReactMarkdown from "react-markdown";
import { Message } from "../../models/Message";

function AiTextMessage({ msg }: { msg: Message }) {
  return (
    <div className="self-start bg-gray-100 px-4 py-2 rounded max-w-xl mr-auto">
      <ReactMarkdown children={msg.content}></ReactMarkdown>
    </div>
  );
}
export default AiTextMessage;
