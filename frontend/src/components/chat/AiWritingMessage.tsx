// import ReactMarkdown from "react-markdown";
import ReactMarkdown from "react-markdown";
import { ChatFormType, ChatRole } from "../../utils/constants";
import { ExtractMessageByFormAndRole } from "./MessageComponentMap";
import { Link } from "react-router-dom";

function AiWritingMessage({
  msg,
}: {
  msg: ExtractMessageByFormAndRole<ChatFormType.WRITING, ChatRole.AI>;
}) {
  return (
    <div className="max-w-lg bg-green-50 border border-green-300 rounded-xl p-4 shadow-sm">
      <div className="flex items-center mb-2">
        <span className="px-2 py-0.5 text-xs font-semibold text-green-700 bg-green-200 rounded-full">
          Feedback
        </span>
        <span className="ml-auto text-xs text-gray-500">
          {msg.date ? new Date(msg.date).toLocaleString() : "Invalid Date"}
        </span>
      </div>

      <p className="text-sm text-gray-700">
        Overall Score:
        <span className="font-bold text-green-800">
          {msg.payload?.overallScore}
        </span>
      </p>
      <div className="text-sm text-gray-700">
        <ReactMarkdown>{msg.payload?.feedback}</ReactMarkdown>
      </div>

      <Link
        to={`/writing/${msg.payload.writingId}`}
        className="mt-2 text-sm text-blue-600 underline hover:text-blue-800"
      >
        View Detailed Feedback
      </Link>
    </div>
  );
}
export default AiWritingMessage;
