import { useEffect, useState } from 'react';

const mathSteps = [
  { icon: '🔢', label: 'Reading the problem', color: 'from-blue-400 to-blue-600' },
  { icon: '🧮', label: 'Setting up calculations', color: 'from-green-400 to-green-600' },
  { icon: '🔍', label: 'Solving step by step', color: 'from-purple-400 to-purple-600' },
  { icon: '✓', label: 'Checking the answer', color: 'from-pink-400 to-pink-600' },
  { icon: '📝', label: 'Writing explanation', color: 'from-orange-400 to-orange-600' }
];

const mathFacts = [
  "🔢 Math is like a puzzle - every piece fits perfectly!",
  "🧠 Your brain gets stronger with every problem you solve!",
  "✨ Numbers are everywhere - in music, art, and nature!",
  "🎯 Every mathematician started by learning just like you!",
  "🚀 Math helps us explore space and build amazing things!"
];

const mathEmojis = ['🔢', '➕', '➖', '✖️', '➗', '📐', '📏', '🧮', '💡', '⭐'];

function MathProgressAnimation() {
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [mathFactIndex, setMathFactIndex] = useState(0);
  const [showMathFact, setShowMathFact] = useState(false);
  const [floatingEmojis, setFloatingEmojis] = useState<Array<{id: number, emoji: string, delay: number}>>([]);

  useEffect(() => {
    const stepInterval = setInterval(() => {
      setCurrentStep((prev) => (prev + 1) % mathSteps.length);
      setProgress((prev) => Math.min(prev + 20, 100)); // 5 steps = 20% each
    }, 2000);

    const factInterval = setInterval(() => {
      setMathFactIndex(Math.floor(Math.random() * mathFacts.length));
      setShowMathFact(true);
      setTimeout(() => setShowMathFact(false), 3000);
    }, 7000);

    // Create floating emojis
    const emojiInterval = setInterval(() => {
      const randomEmoji = mathEmojis[Math.floor(Math.random() * mathEmojis.length)];
      const newEmoji = {
        id: Date.now(),
        emoji: randomEmoji,
        delay: Math.random() * 2
      };
      setFloatingEmojis(prev => [...prev.slice(-3), newEmoji]); // Keep only last 4 emojis
    }, 3000);

    return () => {
      clearInterval(stepInterval);
      clearInterval(factInterval);
      clearInterval(emojiInterval);
    };
  }, []);

  return (
    <div className="relative bg-white rounded-2xl p-6 shadow-lg max-w-lg mx-auto overflow-hidden">
      {/* Floating Emojis Background */}
      {floatingEmojis.map((item) => (
        <div
          key={item.id}
          className="absolute text-2xl opacity-20 animate-bounce pointer-events-none"
          style={{
            left: `${Math.random() * 80 + 10}%`,
            top: `${Math.random() * 60 + 20}%`,
            animationDelay: `${item.delay}s`
          }}
        >
          {item.emoji}
        </div>
      ))}

      {/* Header */}
      <div className="text-center mb-6 relative z-10">
        <h3 className="text-lg font-bold text-gray-800 mb-2">
          🧮 Solving Your Math Problem
        </h3>
        <p className="text-sm text-gray-600">
          Let me work through this step by step...
        </p>
      </div>

      {/* Calculator Animation */}
      <div className="flex justify-center mb-6">
        <div className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-lg p-4 shadow-lg">
          <div className="bg-green-200 rounded px-3 py-2 mb-3 font-mono text-sm text-center">
            <span className="animate-pulse">Calculating...</span>
          </div>
          <div className="grid grid-cols-4 gap-1">
            {[...Array(12)].map((_, i) => (
              <div
                key={i}
                className={`w-6 h-6 rounded bg-gray-600 flex items-center justify-center text-xs text-white ${
                  Math.random() > 0.7 ? 'animate-pulse bg-blue-500' : ''
                }`}
              >
                {i < 9 ? i + 1 : ['+', '0', '='][i - 9]}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="space-y-3 mb-6">
        {mathSteps.map((step, index) => (
          <div key={index} className="flex items-center space-x-3">
            <div className={`w-10 h-10 rounded-full bg-gradient-to-r ${
              index === currentStep ? step.color : 'from-gray-200 to-gray-300'
            } flex items-center justify-center transition-all duration-500 ${
              index === currentStep ? 'scale-110 shadow-lg animate-pulse' : ''
            }`}>
              <span className="text-white text-lg">
                {index === currentStep ? step.icon : index < currentStep ? '✅' : '⏳'}
              </span>
            </div>
            
            <div className="flex-1">
              <p className={`text-sm font-medium transition-colors duration-500 ${
                index === currentStep ? 'text-gray-800' : 
                index < currentStep ? 'text-green-600' : 'text-gray-400'
              }`}>
                {step.label}
              </p>
              
              {index === currentStep && (
                <div className="w-full bg-gray-200 rounded-full h-1 mt-1">
                  <div className={`h-1 bg-gradient-to-r ${step.color} rounded-full animate-pulse transition-all duration-1000`}
                       style={{ width: '70%' }}></div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Progress Circle */}
      <div className="flex justify-center mb-4">
        <div className="relative w-16 h-16">
          <svg className="transform -rotate-90 w-full h-full">
            <circle
              cx="32"
              cy="32"
              r="28"
              stroke="#e5e7eb"
              strokeWidth="4"
              fill="none"
            />
            <circle
              cx="32"
              cy="32"
              r="28"
              stroke="url(#gradient)"
              strokeWidth="4"
              fill="none"
              strokeDasharray={`${progress * 1.76} 176`}
              strokeLinecap="round"
              className="transition-all duration-1000"
            />
            <defs>
              <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#8b5cf6" />
                <stop offset="100%" stopColor="#ec4899" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-sm font-bold text-gray-700">{Math.round(progress)}%</span>
          </div>
        </div>
      </div>

      {/* Math Fact */}
      {showMathFact && (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-3 text-center animate-bounce">
          <p className="text-sm font-medium text-blue-800">
            {mathFacts[mathFactIndex]}
          </p>
        </div>
      )}
    </div>
  );
}

export default MathProgressAnimation;