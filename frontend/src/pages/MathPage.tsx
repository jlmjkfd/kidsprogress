import { useTheme } from '../contexts/ThemeContext';
import { getThemeClasses, getThemeIcons } from '../utils/themeUtils';

function MathPage() {
  const { currentTheme } = useTheme();
  const themeClasses = getThemeClasses(currentTheme);
  const themeIcons = getThemeIcons(currentTheme);

  return (
    <div className={`w-full p-4 lg:p-8 bg-gradient-to-br ${currentTheme.colors.gradients.background} min-h-full`}>
      <div className="w-full text-center">
        <div className="py-20">
          <div className="text-8xl mb-8">{themeIcons.math}</div>
          <h1 className={`text-5xl font-bold bg-gradient-to-r ${currentTheme.colors.gradients.primary} bg-clip-text text-transparent mb-6`}>
            Math Practice
          </h1>
          <p className="text-2xl text-gray-600 mb-8">
            Coming Soon!
          </p>
          <div className={`${themeClasses.card} p-8`}>
            <p className="text-lg text-gray-700 mb-4">
              {currentTheme.name === 'universe' ? '🔮' : '🌋'} We're building something amazing for math practice!
            </p>
            <p className="text-gray-600">
              Check back soon for interactive math problems, games, and progress tracking.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MathPage;