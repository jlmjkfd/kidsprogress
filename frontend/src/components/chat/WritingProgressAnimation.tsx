import { useEffect, useState } from 'react';

const writingSteps = [
  { icon: '📝', label: 'Reading your story', color: 'from-blue-400 to-blue-600' },
  { icon: '🔍', label: 'Analyzing structure', color: 'from-green-400 to-green-600' },
  { icon: '📚', label: 'Checking grammar', color: 'from-purple-400 to-purple-600' },
  { icon: '✨', label: 'Finding improvements', color: 'from-pink-400 to-pink-600' },
  { icon: '💡', label: 'Creating feedback', color: 'from-orange-400 to-orange-600' },
  { icon: '⭐', label: 'Almost done!', color: 'from-yellow-400 to-yellow-600' }
];

const encouragingMessages = [
  "Your creativity is amazing! ✨",
  "Keep up the great writing! 📝",
  "Every word tells a story! 📚",
  "You're becoming a better writer! 🌟",
  "Stories make the world magical! 🪄"
];

function WritingProgressAnimation() {
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [encouragementIndex, setEncouragementIndex] = useState(0);
  const [showEncouragement, setShowEncouragement] = useState(false);

  useEffect(() => {
    const stepInterval = setInterval(() => {
      setCurrentStep((prev) => (prev + 1) % writingSteps.length);
      setProgress((prev) => Math.min(prev + 16.67, 100)); // 6 steps = ~16.67% each
    }, 1500);

    const encouragementInterval = setInterval(() => {
      setEncouragementIndex(Math.floor(Math.random() * encouragingMessages.length));
      setShowEncouragement(true);
      setTimeout(() => setShowEncouragement(false), 2500);
    }, 6000);

    return () => {
      clearInterval(stepInterval);
      clearInterval(encouragementInterval);
    };
  }, []);

  return (
    <div className="bg-white rounded-2xl p-6 shadow-lg max-w-lg mx-auto">
      {/* Header */}
      <div className="text-center mb-6">
        <h3 className="text-lg font-bold text-gray-800 mb-2">
          📝 Analyzing Your Writing
        </h3>
        <p className="text-sm text-gray-600">
          Our AI teacher is carefully reading your work...
        </p>
      </div>

      {/* Progress Steps */}
      <div className="space-y-3 mb-6">
        {writingSteps.map((step, index) => (
          <div key={index} className="flex items-center space-x-3">
            {/* Step Icon */}
            <div className={`w-10 h-10 rounded-full bg-gradient-to-r ${
              index === currentStep ? step.color : 'from-gray-200 to-gray-300'
            } flex items-center justify-center transition-all duration-500 ${
              index === currentStep ? 'scale-110 shadow-lg' : ''
            }`}>
              <span className="text-white text-lg">
                {index === currentStep ? step.icon : index < currentStep ? '✅' : '⏳'}
              </span>
            </div>
            
            {/* Step Label */}
            <div className="flex-1">
              <p className={`text-sm font-medium transition-colors duration-500 ${
                index === currentStep ? 'text-gray-800' : 
                index < currentStep ? 'text-green-600' : 'text-gray-400'
              }`}>
                {step.label}
              </p>
              
              {/* Mini progress bar for current step */}
              {index === currentStep && (
                <div className="w-full bg-gray-200 rounded-full h-1 mt-1">
                  <div className={`h-1 bg-gradient-to-r ${step.color} rounded-full animate-pulse transition-all duration-1000`}
                       style={{ width: '60%' }}></div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Overall Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-gray-600 mb-2">
          <span>Progress</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div className="h-3 bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 rounded-full transition-all duration-1000 ease-out"
               style={{ width: `${progress}%` }}></div>
        </div>
      </div>

      {/* Encouraging Message */}
      {showEncouragement && (
        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg p-3 text-center animate-bounce">
          <p className="text-sm font-medium text-orange-800">
            {encouragingMessages[encouragementIndex]}
          </p>
        </div>
      )}

      {/* Fun Animation Elements */}
      <div className="flex justify-center space-x-2 mt-4">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"
            style={{ animationDelay: `${i * 0.1}s` }}
          ></div>
        ))}
      </div>
    </div>
  );
}

export default WritingProgressAnimation;