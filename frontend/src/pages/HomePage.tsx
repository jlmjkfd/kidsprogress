import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

interface QuickStats {
  totalWritings: number;
  averageScore: number;
  recentActivity: string;
}

function HomePage() {
  const [stats, setStats] = useState<QuickStats | null>(null);

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
    <div className="w-full p-4 lg:p-8 bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 min-h-full">
      <div className="w-full space-y-6 lg:space-y-8">
        {/* Welcome Header */}
        <div className="text-center py-12">
          <h1 className="text-6xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 bg-clip-text text-transparent mb-6">
            Welcome to Kids Progress! 🌟
          </h1>
          <p className="text-2xl text-gray-600 mb-8">
            Your amazing learning journey starts here
          </p>
          <div className="inline-flex items-center space-x-3 bg-white/70 backdrop-blur-sm rounded-2xl px-6 py-3 border border-purple-200">
            <span className="text-3xl">🚀</span>
            <span className="text-lg font-medium text-purple-700">
              Ready to learn something new today?
            </span>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6 mb-8 lg:mb-12">
          <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-6 shadow-xl border border-purple-100">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-gradient-to-r from-purple-400 to-pink-400 rounded-2xl flex items-center justify-center">
                <span className="text-2xl">📚</span>
              </div>
              <div>
                <p className="text-3xl font-bold text-purple-700">
                  {stats?.totalWritings || 0}
                </p>
                <p className="text-gray-600">Stories Written</p>
              </div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-6 shadow-xl border border-blue-100">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-400 to-cyan-400 rounded-2xl flex items-center justify-center">
                <span className="text-2xl">⭐</span>
              </div>
              <div>
                <p className="text-3xl font-bold text-blue-700">
                  {stats?.averageScore.toFixed(1) || '0.0'}
                </p>
                <p className="text-gray-600">Average Score</p>
              </div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-6 shadow-xl border border-green-100">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-gradient-to-r from-green-400 to-emerald-400 rounded-2xl flex items-center justify-center">
                <span className="text-2xl">🎯</span>
              </div>
              <div>
                <p className="text-3xl font-bold text-green-700">
                  {stats?.recentActivity || 'Today'}
                </p>
                <p className="text-gray-600">Last Activity</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-8 shadow-xl border border-purple-100">
          <h2 className="text-3xl font-bold text-center mb-8 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            What would you like to do today? 🎨
          </h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-4 lg:gap-6">
            <Link
              to="/writing/create"
              className="group bg-gradient-to-r from-purple-500 to-pink-500 rounded-3xl p-6 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
            >
              <div className="text-center">
                <div className="text-4xl mb-4">✏️</div>
                <h3 className="text-xl font-bold mb-2">Write a Story</h3>
                <p className="text-purple-100 text-sm">
                  Create your next amazing adventure
                </p>
              </div>
            </Link>

            <Link
              to="/writing"
              className="group bg-gradient-to-r from-blue-500 to-cyan-500 rounded-3xl p-6 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
            >
              <div className="text-center">
                <div className="text-4xl mb-4">📖</div>
                <h3 className="text-xl font-bold mb-2">My Stories</h3>
                <p className="text-blue-100 text-sm">
                  Read and review your stories
                </p>
              </div>
            </Link>

            <Link
              to="/math"
              className="group bg-gradient-to-r from-green-500 to-emerald-500 rounded-3xl p-6 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
            >
              <div className="text-center">
                <div className="text-4xl mb-4">🔢</div>
                <h3 className="text-xl font-bold mb-2">Practice Math</h3>
                <p className="text-green-100 text-sm">
                  Solve fun math problems
                </p>
              </div>
            </Link>

            <div className="group bg-gradient-to-r from-yellow-500 to-orange-500 rounded-3xl p-6 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 cursor-pointer">
              <div className="text-center">
                <div className="text-4xl mb-4">💬</div>
                <h3 className="text-xl font-bold mb-2">Ask Questions</h3>
                <p className="text-yellow-100 text-sm">
                  Chat with your AI teacher
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-8 shadow-xl border border-blue-100">
          <h2 className="text-2xl font-bold mb-6 text-blue-700 flex items-center space-x-2">
            <span>📈</span>
            <span>Your Progress Journey</span>
          </h2>
          
          <div className="space-y-4">
            <div className="flex items-center space-x-4 p-4 bg-purple-50 rounded-2xl">
              <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xl">✨</span>
              </div>
              <div className="flex-1">
                <p className="font-semibold text-purple-700">Keep up the great work!</p>
                <p className="text-sm text-gray-600">
                  You're doing amazing with your writing practice
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-4 p-4 bg-blue-50 rounded-2xl">
              <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xl">🎯</span>
              </div>
              <div className="flex-1">
                <p className="font-semibold text-blue-700">Ready for new challenges?</p>
                <p className="text-sm text-gray-600">
                  Try writing a story in a different genre today
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-4 p-4 bg-green-50 rounded-2xl">
              <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xl">🏆</span>
              </div>
              <div className="flex-1">
                <p className="font-semibold text-green-700">Achievement unlocked!</p>
                <p className="text-sm text-gray-600">
                  You've written your first story - congratulations!
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Fun Facts */}
        <div className="text-center py-8">
          <div className="inline-flex items-center space-x-6 bg-white/70 backdrop-blur-sm rounded-3xl px-8 py-4 border border-pink-200">
            <div className="text-center">
              <div className="text-2xl">🎨</div>
              <div className="text-sm text-gray-600">Creative</div>
            </div>
            <div className="text-center">
              <div className="text-2xl">🚀</div>
              <div className="text-sm text-gray-600">Fun</div>
            </div>
            <div className="text-center">
              <div className="text-2xl">🌟</div>
              <div className="text-sm text-gray-600">Educational</div>
            </div>
            <div className="text-center">
              <div className="text-2xl">💝</div>
              <div className="text-sm text-gray-600">Encouraging</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default HomePage;