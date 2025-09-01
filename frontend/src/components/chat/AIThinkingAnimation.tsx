import { useEffect, useState } from 'react';
import { ChatFormType } from '../../utils/constants';

interface AIThinkingAnimationProps {
  workflowType?: string;
  formType?: ChatFormType;
}

const thinkingMessages = {
  writing: [
    "📝 Reading your amazing story...",
    "🤔 Thinking about your writing style...", 
    "✨ Analyzing your creativity...",
    "📚 Checking grammar and structure...",
    "🎨 Preparing personalized feedback...",
    "⭐ Almost ready with suggestions!"
  ],
  math: [
    "🔢 Working on your math problem...",
    "🧮 Calculating the solution...",
    "💭 Checking my work twice...",
    "✨ Preparing helpful explanations...",
    "🎯 Almost got the answer!"
  ],
  analysis: [
    "📊 Analyzing your progress...",
    "🔍 Looking at your learning patterns...",
    "📈 Finding insights about your work...",
    "💡 Preparing helpful suggestions...",
    "🎯 Creating your personalized report!"
  ],
  general: [
    "🤖 AI is thinking...",
    "💭 Processing your question...",
    "✨ Finding the best answer...",
    "🎯 Almost ready to help!"
  ]
};

const learningTips = [
  "💡 Tip: Reading books helps improve your writing!",
  "🌟 Fun fact: Practice makes your brain stronger!",
  "📚 Remember: Every mistake helps you learn something new!",
  "🎯 Keep going: You're doing an amazing job!",
  "✨ Did you know: Your brain loves to learn new things!",
  "🚀 Pro tip: Take breaks to help your brain rest and grow!"
];

function AIThinkingAnimation({ workflowType = 'general', formType }: AIThinkingAnimationProps) {
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [showTip, setShowTip] = useState(false);
  const [tipIndex, setTipIndex] = useState(0);

  // Determine workflow type from formType if available
  const workflowKey = formType === ChatFormType.WRITING ? 'writing' : 
                     formType === ChatFormType.MATH ? 'math' : 
                     workflowType as keyof typeof thinkingMessages;

  const messages = thinkingMessages[workflowKey] || thinkingMessages.general;

  useEffect(() => {
    const messageInterval = setInterval(() => {
      setCurrentMessageIndex((prev) => (prev + 1) % messages.length);
    }, 2000); // Change message every 2 seconds

    const tipInterval = setInterval(() => {
      setShowTip(true);
      setTipIndex(Math.floor(Math.random() * learningTips.length));
      setTimeout(() => setShowTip(false), 3000); // Show tip for 3 seconds
    }, 8000); // Show tip every 8 seconds

    return () => {
      clearInterval(messageInterval);
      clearInterval(tipInterval);
    };
  }, [messages.length]);

  return (
    <div className="flex flex-col items-center space-y-4 py-6">
      {/* Main AI thinking animation */}
      <div className="bg-white rounded-2xl px-6 py-4 shadow-lg max-w-md mx-auto">
        <div className="flex items-center space-x-3">
          {/* Animated AI avatar */}
          <div className="relative">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full flex items-center justify-center shadow-lg animate-pulse">
              <span className="text-white text-xl">🤖</span>
            </div>
            {/* Thinking bubbles */}
            <div className="absolute -top-1 -right-1">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-blue-300 rounded-full animate-bounce" style={{animationDelay: '0s'}}></div>
                <div className="w-1.5 h-1.5 bg-purple-300 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                <div className="w-1 h-1 bg-pink-300 rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></div>
              </div>
            </div>
          </div>
          
          {/* Message */}
          <div className="flex-1">
            <p className="text-sm text-gray-700 font-medium animate-pulse">
              {messages[currentMessageIndex]}
            </p>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-64 bg-gray-200 rounded-full h-2 overflow-hidden">
        <div className="h-full bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 rounded-full animate-pulse"></div>
      </div>

      {/* Rotating progress indicators */}
      <div className="flex space-x-2">
        <div className="w-3 h-3 bg-blue-400 rounded-full animate-spin"></div>
        <div className="w-3 h-3 bg-purple-400 rounded-full animate-spin" style={{animationDelay: '0.1s'}}></div>
        <div className="w-3 h-3 bg-pink-400 rounded-full animate-spin" style={{animationDelay: '0.2s'}}></div>
        <div className="w-3 h-3 bg-orange-400 rounded-full animate-spin" style={{animationDelay: '0.3s'}}></div>
      </div>

      {/* Learning tip popup */}
      {showTip && (
        <div className="bg-gradient-to-r from-yellow-100 to-orange-100 border-l-4 border-yellow-400 px-4 py-3 rounded-lg shadow-md animate-bounce max-w-md mx-auto">
          <p className="text-sm text-yellow-800 font-medium">
            {learningTips[tipIndex]}
          </p>
        </div>
      )}

      {/* Fun loading elements */}
      <div className="flex space-x-4 mt-4">
        <div className="flex flex-col items-center space-y-1">
          <div className="w-8 h-8 bg-gradient-to-r from-green-400 to-blue-500 rounded-full flex items-center justify-center animate-bounce">
            <span className="text-white text-sm">📖</span>
          </div>
          <span className="text-xs text-gray-500">Learning</span>
        </div>
        
        <div className="flex flex-col items-center space-y-1">
          <div className="w-8 h-8 bg-gradient-to-r from-purple-400 to-pink-500 rounded-full flex items-center justify-center animate-bounce" style={{animationDelay: '0.2s'}}>
            <span className="text-white text-sm">✨</span>
          </div>
          <span className="text-xs text-gray-500">Analyzing</span>
        </div>
        
        <div className="flex flex-col items-center space-y-1">
          <div className="w-8 h-8 bg-gradient-to-r from-orange-400 to-red-500 rounded-full flex items-center justify-center animate-bounce" style={{animationDelay: '0.4s'}}>
            <span className="text-white text-sm">🎯</span>
          </div>
          <span className="text-xs text-gray-500">Preparing</span>
        </div>
      </div>
    </div>
  );
}

export default AIThinkingAnimation;