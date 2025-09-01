import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { getThemeClasses, getThemeIcons } from '../utils/themeUtils';

interface QuickStats {
  totalWritings: number;
  averageScore: number;
  recentActivity: string;
}

function HomePage() {
  const [stats, setStats] = useState<QuickStats | null>(null);
  const { currentTheme } = useTheme();
  const themeClasses = getThemeClasses(currentTheme);
  const themeIcons = getThemeIcons(currentTheme);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/analytics/summary');
        if (response.ok) {
          const data = await response.json();
          setStats({
            totalWritings: data.totalWritings || 0,
            averageScore: data.averageScore || 0,
            recentActivity: 'Today'
          });
        }
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      }
    };

    fetchStats();
  }, []);

  return (
    <div className={`w-full p-4 lg:p-8 bg-gradient-to-br ${currentTheme.colors.gradients.background} min-h-full`}>
      <div className="w-full space-y-6 lg:space-y-8">
        {/* Welcome Header */}
        <div className="text-center py-12">
          <h1 className={`text-6xl font-bold bg-gradient-to-r ${currentTheme.colors.gradients.primary} bg-clip-text text-transparent mb-6`}>
            Welcome to Kids Progress! {currentTheme.emoji}
          </h1>
          <p className="text-2xl text-gray-600 mb-8">
            Your amazing learning journey starts here
          </p>
          <div className={`inline-flex items-center space-x-3 bg-white/70 backdrop-blur-sm rounded-2xl px-6 py-3 border ${themeClasses.primaryBorder}`}>
            <span className="text-3xl">{themeIcons.success}</span>
            <span className={`text-lg font-medium ${themeClasses.primaryText}`}>
              Ready to learn something new today?
            </span>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6 mb-8 lg:mb-12">
          <div className={`${themeClasses.card}`}>
            <div className="flex items-center space-x-4">
              <div className={`w-16 h-16 bg-gradient-to-r ${currentTheme.colors.gradients.primary} rounded-2xl flex items-center justify-center`}>
                <span className="text-2xl">{themeIcons.writing}</span>
              </div>
              <div>
                <p className={`text-3xl font-bold ${themeClasses.primaryText}`}>
                  {stats?.totalWritings || 0}
                </p>
                <p className="text-gray-600">Stories Written</p>
              </div>
            </div>
          </div>

          <div className={`${themeClasses.card}`}>
            <div className="flex items-center space-x-4">
              <div className={`w-16 h-16 bg-gradient-to-r ${currentTheme.colors.gradients.secondary} rounded-2xl flex items-center justify-center`}>
                <span className="text-2xl">{themeIcons.success}</span>
              </div>
              <div>
                <p className={`text-3xl font-bold ${themeClasses.secondaryText}`}>
                  {stats?.averageScore.toFixed(1) || '0.0'}
                </p>
                <p className="text-gray-600">Average Score</p>
              </div>
            </div>
          </div>

          <div className={`${themeClasses.card}`}>
            <div className="flex items-center space-x-4">
              <div className={`w-16 h-16 bg-gradient-to-r ${currentTheme.colors.gradients.primary} rounded-2xl flex items-center justify-center`}>
                <span className="text-2xl">{themeIcons.thinking}</span>
              </div>
              <div>
                <p className={`text-3xl font-bold ${themeClasses.primaryText}`}>
                  {stats?.recentActivity || 'Today'}
                </p>
                <p className="text-gray-600">Last Activity</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className={`${themeClasses.card} p-8`}>
          <h2 className={`text-3xl font-bold text-center mb-8 bg-gradient-to-r ${currentTheme.colors.gradients.primary} bg-clip-text text-transparent`}>
            What would you like to do today? {currentTheme.emoji}
          </h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-4 lg:gap-6">
            <Link
              to="/writing/create"
              className={`group bg-gradient-to-r ${currentTheme.colors.gradients.primary} rounded-3xl p-6 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105`}
            >
              <div className="text-center">
                <div className="text-4xl mb-4">{themeIcons.writing}</div>
                <h3 className="text-xl font-bold mb-2">Write a Story</h3>
                <p className="text-white/80 text-sm">
                  Create your next amazing adventure
                </p>
              </div>
            </Link>

            <Link
              to="/writing"
              className={`group bg-gradient-to-r ${currentTheme.colors.gradients.secondary} rounded-3xl p-6 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105`}
            >
              <div className="text-center">
                <div className="text-4xl mb-4">📖</div>
                <h3 className="text-xl font-bold mb-2">My Stories</h3>
                <p className="text-white/80 text-sm">
                  Read and review your stories
                </p>
              </div>
            </Link>

            <Link
              to="/math"
              className={`group bg-gradient-to-r ${currentTheme.colors.gradients.primary} rounded-3xl p-6 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105`}
            >
              <div className="text-center">
                <div className="text-4xl mb-4">{themeIcons.math}</div>
                <h3 className="text-xl font-bold mb-2">Practice Math</h3>
                <p className="text-white/80 text-sm">
                  Solve fun math problems
                </p>
              </div>
            </Link>

            <div className={`group bg-gradient-to-r ${currentTheme.colors.gradients.secondary} rounded-3xl p-6 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 cursor-pointer`}>
              <div className="text-center">
                <div className="text-4xl mb-4">{themeIcons.chat}</div>
                <h3 className="text-xl font-bold mb-2">Ask Questions</h3>
                <p className="text-white/80 text-sm">
                  Chat with your AI teacher
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className={`${themeClasses.card} p-8`}>
          <h2 className={`text-2xl font-bold mb-6 ${themeClasses.primaryText} flex items-center space-x-2`}>
            <span>{themeIcons.thinking}</span>
            <span>Your Progress Journey</span>
          </h2>
          
          <div className="space-y-4">
            <div className={`flex items-center space-x-4 p-4 bg-gradient-to-r ${currentTheme.colors.gradients.background} rounded-2xl`}>
              <div className={`w-12 h-12 bg-gradient-to-r ${currentTheme.colors.gradients.primary} rounded-full flex items-center justify-center`}>
                <span className="text-white text-xl">{themeIcons.success}</span>
              </div>
              <div className="flex-1">
                <p className={`font-semibold ${themeClasses.primaryText}`}>Keep up the great work!</p>
                <p className="text-sm text-gray-600">
                  You're doing amazing with your writing practice
                </p>
              </div>
            </div>

            <div className={`flex items-center space-x-4 p-4 bg-gradient-to-r ${currentTheme.colors.gradients.background} rounded-2xl`}>
              <div className={`w-12 h-12 bg-gradient-to-r ${currentTheme.colors.gradients.secondary} rounded-full flex items-center justify-center`}>
                <span className="text-white text-xl">{themeIcons.loading}</span>
              </div>
              <div className="flex-1">
                <p className={`font-semibold ${themeClasses.secondaryText}`}>Ready for new challenges?</p>
                <p className="text-sm text-gray-600">
                  Try writing a story in a different genre today
                </p>
              </div>
            </div>

            <div className={`flex items-center space-x-4 p-4 bg-gradient-to-r ${currentTheme.colors.gradients.background} rounded-2xl`}>
              <div className={`w-12 h-12 bg-gradient-to-r ${currentTheme.colors.gradients.primary} rounded-full flex items-center justify-center`}>
                <span className="text-white text-xl">{currentTheme.name === 'universe' ? '🏆' : '🌟'}</span>
              </div>
              <div className="flex-1">
                <p className={`font-semibold ${themeClasses.primaryText}`}>Achievement unlocked!</p>
                <p className="text-sm text-gray-600">
                  You've written your first story - congratulations!
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Fun Facts */}
        <div className="text-center py-8">
          <div className={`inline-flex items-center space-x-6 bg-white/70 backdrop-blur-sm rounded-3xl px-8 py-4 border ${themeClasses.primaryBorder}`}>
            <div className="text-center">
              <div className="text-2xl">{currentTheme.name === 'universe' ? '🌟' : '🎨'}</div>
              <div className="text-sm text-gray-600">Creative</div>
            </div>
            <div className="text-center">
              <div className="text-2xl">{currentTheme.name === 'universe' ? '🚀' : '🦕'}</div>
              <div className="text-sm text-gray-600">Fun</div>
            </div>
            <div className="text-center">
              <div className="text-2xl">{themeIcons.success}</div>
              <div className="text-sm text-gray-600">Educational</div>
            </div>
            <div className="text-center">
              <div className="text-2xl">{currentTheme.name === 'universe' ? '💫' : '🌿'}</div>
              <div className="text-sm text-gray-600">Encouraging</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default HomePage;