import React from 'react';
import { Link } from 'react-router-dom';
import { useTheme, ThemeName } from '../../contexts/ThemeContext';

function SettingsPage() {
  const { currentTheme, setTheme, themes } = useTheme();

  const handleThemeChange = (themeName: ThemeName) => {
    setTheme(themeName);
  };

  return (
    <div className={`min-h-screen bg-gradient-to-br ${currentTheme.colors.gradients.background} p-4 lg:p-6`}>
      {/* Header */}
      <div className="mb-8">
        <Link
          to="/"
          className={`inline-flex items-center space-x-2 text-${currentTheme.name === 'universe' ? 'purple' : 'green'}-600 hover:text-${currentTheme.name === 'universe' ? 'purple' : 'green'}-800 font-medium transition-colors duration-200 group mb-4`}
        >
          <span className="group-hover:-translate-x-1 transition-transform duration-200">←</span>
          <span>Back to Home</span>
        </Link>
        
        <div className="text-center">
          <h1 className={`text-4xl lg:text-5xl font-bold bg-gradient-to-r ${currentTheme.colors.gradients.primary} bg-clip-text text-transparent mb-4`}>
            ⚙️ Settings
          </h1>
          <p className="text-gray-600 text-lg">
            Customize your learning experience
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto">
        {/* Theme Settings Card */}
        <div className={`bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl border border-${currentTheme.name === 'universe' ? 'purple' : 'green'}-200 overflow-hidden mb-8`}>
          {/* Card Header */}
          <div className={`bg-gradient-to-r ${currentTheme.colors.gradients.primary} text-white p-6`}>
            <div className="flex items-center space-x-3">
              <span className="text-3xl">🎨</span>
              <div>
                <h2 className="text-2xl font-bold">Theme Selection</h2>
                <p className="text-white/90">Choose your adventure theme</p>
              </div>
            </div>
          </div>

          {/* Theme Options */}
          <div className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {Object.values(themes).map((theme) => (
                <div
                  key={theme.name}
                  onClick={() => handleThemeChange(theme.name)}
                  className={`
                    relative p-6 rounded-2xl border-2 cursor-pointer transition-all duration-300 transform hover:scale-105
                    ${currentTheme.name === theme.name
                      ? `border-${theme.name === 'universe' ? 'purple' : 'green'}-500 bg-gradient-to-br ${theme.colors.gradients.background} shadow-lg`
                      : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
                    }
                  `}
                >
                  {/* Theme Preview */}
                  <div className="text-center mb-4">
                    <div className="text-6xl mb-2">{theme.emoji}</div>
                    <h3 className={`text-xl font-bold ${currentTheme.name === theme.name ? 'text-white' : 'text-gray-800'}`}>
                      {theme.displayName}
                    </h3>
                    <p className={`text-sm ${currentTheme.name === theme.name ? 'text-white/80' : 'text-gray-600'}`}>
                      {theme.description}
                    </p>
                  </div>

                  {/* Color Palette Preview */}
                  <div className="flex justify-center space-x-2 mb-4">
                    <div
                      className="w-6 h-6 rounded-full border-2 border-white shadow-sm"
                      style={{ backgroundColor: theme.colors.primary }}
                    ></div>
                    <div
                      className="w-6 h-6 rounded-full border-2 border-white shadow-sm"
                      style={{ backgroundColor: theme.colors.secondary }}
                    ></div>
                    <div
                      className="w-6 h-6 rounded-full border-2 border-white shadow-sm"
                      style={{ backgroundColor: theme.colors.accent }}
                    ></div>
                  </div>

                  {/* Selected Indicator */}
                  {currentTheme.name === theme.name && (
                    <div className="absolute top-4 right-4">
                      <div className="bg-white/20 backdrop-blur-sm rounded-full p-2">
                        <span className="text-white text-lg">✓</span>
                      </div>
                    </div>
                  )}

                  {/* Sample UI Preview */}
                  <div className="mt-4 space-y-2">
                    <div className={`h-3 bg-gradient-to-r ${theme.colors.gradients.primary} rounded-full opacity-60`}></div>
                    <div className={`h-2 bg-gradient-to-r ${theme.colors.gradients.secondary} rounded-full w-3/4 opacity-40`}></div>
                  </div>
                </div>
              ))}
            </div>

            {/* Current Theme Info */}
            <div className={`mt-8 p-6 bg-gradient-to-r ${currentTheme.colors.gradients.background} rounded-2xl border border-gray-200`}>
              <div className="flex items-center space-x-4">
                <div className="text-4xl">{currentTheme.emoji}</div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">
                    Current Theme: {currentTheme.displayName}
                  </h3>
                  <p className="text-gray-600">{currentTheme.description}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Future Settings Card */}
        <div className={`bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl border border-${currentTheme.name === 'universe' ? 'purple' : 'green'}-200 overflow-hidden`}>
          <div className={`bg-gradient-to-r ${currentTheme.colors.gradients.secondary} text-white p-6`}>
            <div className="flex items-center space-x-3">
              <span className="text-3xl">🔧</span>
              <div>
                <h2 className="text-2xl font-bold">More Settings</h2>
                <p className="text-white/90">Coming soon...</p>
              </div>
            </div>
          </div>

          <div className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Future setting placeholders */}
              <div className="p-4 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-300">
                <div className="text-center text-gray-500">
                  <div className="text-2xl mb-2">🔊</div>
                  <h3 className="font-semibold">Sound Effects</h3>
                  <p className="text-sm">Enable/disable sounds</p>
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-300">
                <div className="text-center text-gray-500">
                  <div className="text-2xl mb-2">🌙</div>
                  <h3 className="font-semibold">Dark Mode</h3>
                  <p className="text-sm">Toggle dark theme</p>
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-300">
                <div className="text-center text-gray-500">
                  <div className="text-2xl mb-2">📝</div>
                  <h3 className="font-semibold">Font Size</h3>
                  <p className="text-sm">Adjust text size</p>
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-300">
                <div className="text-center text-gray-500">
                  <div className="text-2xl mb-2">🎯</div>
                  <h3 className="font-semibold">Difficulty</h3>
                  <p className="text-sm">Set challenge level</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SettingsPage;