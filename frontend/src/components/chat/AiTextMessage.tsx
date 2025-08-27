import ReactMarkdown from "react-markdown";
import { Message } from "../../models/Message";

function AiTextMessage({ msg }: { msg: Message }) {
  return (
    <div className="flex items-start space-x-2 group">
      <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-r from-blue-400 to-cyan-400 rounded-full flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-200">
        <span className="text-white text-sm">🤖</span>
      </div>
      <div className="max-w-xs lg:max-w-md">
        <div className="bg-white border-2 border-blue-100 px-4 py-3 rounded-2xl rounded-bl-sm shadow-lg hover:shadow-xl transition-shadow duration-200">
          <div className="prose prose-sm lg:prose-base prose-purple max-w-none">
            <ReactMarkdown 
              children={msg.content}
              components={{
                p: ({children}) => <p className="mb-2 last:mb-0 text-gray-700 leading-relaxed">{children}</p>,
                strong: ({children}) => <strong className="text-purple-600 font-semibold">{children}</strong>,
                em: ({children}) => <em className="text-pink-600">{children}</em>,
                ul: ({children}) => <ul className="list-disc list-inside space-y-1 text-gray-700">{children}</ul>,
                ol: ({children}) => <ol className="list-decimal list-inside space-y-1 text-gray-700">{children}</ol>,
                li: ({children}) => <li className="text-sm lg:text-base">{children}</li>,
                h1: ({children}) => <h1 className="text-lg font-bold text-purple-600 mb-2">{children}</h1>,
                h2: ({children}) => <h2 className="text-base font-bold text-purple-600 mb-1">{children}</h2>,
                h3: ({children}) => <h3 className="text-sm font-semibold text-purple-600 mb-1">{children}</h3>,
                code: ({children}) => <code className="bg-purple-50 text-purple-700 px-1 py-0.5 rounded text-sm">{children}</code>
              }}
            />
          </div>
        </div>
        <div className="flex justify-start mt-1">
          <span className="text-xs text-gray-400">
            {msg.date ? new Date(msg.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}
          </span>
        </div>
      </div>
    </div>
  );
}
export default AiTextMessage;
