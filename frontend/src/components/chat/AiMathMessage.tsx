import { Message } from "../../models/Message";
import { ChatFormType, ChatRole } from "../../utils/constants";

type MathMessage = Extract<Message, { formType: ChatFormType.MATH; role: ChatRole.AI }>;

interface AiMathMessageProps {
  msg: MathMessage;
}

function AiMathMessage({ msg }: AiMathMessageProps) {
  return (
    <div className="flex justify-start items-start space-x-2 group">
      <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-200">
        <span className="text-white text-sm">🤖</span>
      </div>
      
      <div className="max-w-xs lg:max-w-lg">
        <div className="bg-white border border-gray-200 px-4 py-3 rounded-2xl rounded-bl-sm shadow-lg">
          {/* AI Math Response Header */}
          <div className="flex items-center space-x-2 mb-3">
            <span className="text-lg">🎯</span>
            <span className="text-xs font-medium text-gray-600">Math Solution</span>
          </div>
          
          {/* Solution Content */}
          <div className="space-y-3">
            {/* AI Response Text */}
            <p className="text-sm lg:text-base text-gray-800 leading-relaxed">
              {msg.content}
            </p>
            
            {/* Math Results */}
            {msg.payload && (
              <div className="space-y-3">
                {/* Correct Answer */}
                {msg.payload.correctAnswer && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="text-green-600">✅</span>
                      <span className="text-sm font-medium text-green-800">Answer</span>
                    </div>
                    <p className="text-lg font-bold text-green-900">
                      {msg.payload.correctAnswer}
                    </p>
                  </div>
                )}
                
                {/* Step-by-step Solution */}
                {msg.payload.solution && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="text-blue-600">📝</span>
                      <span className="text-sm font-medium text-blue-800">Solution Steps</span>
                    </div>
                    <div className="text-sm text-blue-900 whitespace-pre-line">
                      {msg.payload.solution}
                    </div>
                  </div>
                )}
                
                {/* Score/Feedback */}
                {msg.payload.score !== undefined && (
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="text-purple-600">⭐</span>
                        <span className="text-sm font-medium text-purple-800">Score</span>
                      </div>
                      <span className="text-lg font-bold text-purple-900">
                        {msg.payload.score}/10
                      </span>
                    </div>
                    
                    {msg.payload.feedback && (
                      <p className="text-sm text-purple-800 mt-2">
                        {msg.payload.feedback}
                      </p>
                    )}
                  </div>
                )}
                
                {/* Hints Used */}
                {msg.payload.hintsUsed && msg.payload.hintsUsed.length > 0 && (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="text-orange-600">💡</span>
                      <span className="text-sm font-medium text-orange-800">
                        Hints Used ({msg.payload.hintsUsed.length})
                      </span>
                    </div>
                    <ul className="text-sm text-orange-900 space-y-1">
                      {msg.payload.hintsUsed.map((hint: string, index: number) => (
                        <li key={index} className="flex items-start space-x-2">
                          <span className="text-orange-600 mt-0.5">•</span>
                          <span>{hint}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
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

export default AiMathMessage;