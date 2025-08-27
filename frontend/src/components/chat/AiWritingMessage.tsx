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
  const score = msg.payload?.overallScore;
  const getScoreColor = (score: number) => {
    if (score >= 9) return "from-green-400 to-emerald-400";
    if (score >= 7) return "from-yellow-400 to-orange-400";
    if (score >= 5) return "from-orange-400 to-red-400";
    return "from-red-400 to-pink-400";
  };

  const getScoreEmoji = (score: number) => {
    if (score >= 9) return "🏆";
    if (score >= 7) return "⭐";
    if (score >= 5) return "👍";
    return "💪";
  };

  return (
    <div className="flex items-start space-x-2 group">
      <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-r from-green-400 to-emerald-400 rounded-full flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-200">
        <span className="text-white text-sm">🎓</span>
      </div>
      <div className="max-w-xs lg:max-w-md">
        <div className="bg-white border-2 border-green-100 rounded-2xl rounded-bl-sm shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-200">
          {/* Header */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 px-4 py-3 border-b border-green-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-lg">🎯</span>
                <span className="text-sm font-semibold text-green-700">
                  Writing Feedback
                </span>
              </div>
              <span className="text-xs text-gray-500">
                {msg.date
                  ? new Date(msg.date).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : ""}
              </span>
            </div>
          </div>

          {/* Score */}
          <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50">
            <div className="flex items-center justify-center space-x-3">
              <div
                className={`bg-gradient-to-r ${getScoreColor(
                  score || 0
                )} text-white w-12 h-12 rounded-full flex items-center justify-center shadow-lg`}
              >
                <span className="text-xl font-bold">{score}</span>
              </div>
              <div className="text-center">
                <div className="text-2xl mb-1">{getScoreEmoji(score || 0)}</div>
                <p className="text-sm font-semibold text-gray-700">
                  Great job!
                </p>
              </div>
            </div>
          </div>

          {/* Feedback */}
          <div className="p-4">
            <div className="prose prose-sm max-w-none">
              <ReactMarkdown
                children={msg.payload?.feedback || ""}
                components={{
                  p: ({ children }) => (
                    <p className="mb-2 last:mb-0 text-gray-700 text-sm leading-relaxed">
                      {children}
                    </p>
                  ),
                  strong: ({ children }) => (
                    <strong className="text-purple-600 font-semibold">
                      {children}
                    </strong>
                  ),
                  em: ({ children }) => (
                    <em className="text-pink-600">{children}</em>
                  ),
                  ul: ({ children }) => (
                    <ul className="list-disc list-inside space-y-1 text-gray-700">
                      {children}
                    </ul>
                  ),
                  li: ({ children }) => <li className="text-sm">{children}</li>,
                }}
              />
            </div>

            {msg.payload?.writingId && (
              <Link
                to={`/writing/${msg.payload.writingId}`}
                className="mt-3 inline-flex items-center space-x-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-2 rounded-full text-sm font-medium hover:shadow-lg transition-all duration-200 transform hover:scale-105"
              >
                <span>View Details</span>
                <span>📊</span>
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
export default AiWritingMessage;
