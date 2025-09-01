import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { AppDispatch } from "../../store";
import { useEffect } from "react";
import {
  fetchWritings,
  selectWritingLoading,
  selectWritings,
  selectWritingViewMode,
  setViewMode,
} from "../../store/modules/writingSlice";
import { useTheme } from "../../contexts/ThemeContext";
import { getThemeClasses, getThemeIcons } from "../../utils/themeUtils";

function WritingListPage() {
  const dispatch = useDispatch<AppDispatch>();
  const writings = useSelector(selectWritings);
  const loading = useSelector(selectWritingLoading);
  const viewMode = useSelector(selectWritingViewMode);
  const { currentTheme } = useTheme();
  const themeClasses = getThemeClasses(currentTheme);
  const themeIcons = getThemeIcons(currentTheme);

  useEffect(() => {
    dispatch(fetchWritings());
  }, [dispatch]);

  if (loading) {
    return (
      <div className={`flex flex-col items-center justify-center min-h-96 space-y-4 bg-gradient-to-br ${currentTheme.colors.gradients.background} p-8 rounded-3xl`}>
        <div className="relative">
          <div className={`w-16 h-16 border-4 border-white/30 border-t-white rounded-full animate-spin`}></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-2xl">{themeIcons.loading}</span>
          </div>
        </div>
        <p className={`text-lg font-semibold text-white`}>Loading your amazing stories...</p>
      </div>
    );
  }

  return (
    <div className={`w-full p-4 lg:p-6 space-y-6 min-h-screen bg-gradient-to-br ${currentTheme.colors.gradients.background}`}>
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className={`text-4xl font-bold bg-gradient-to-r ${currentTheme.colors.gradients.primary} bg-clip-text text-transparent mb-2`}>
          📖 My Story Collection
        </h1>
        <p className="text-gray-600">All your wonderful stories in one place!</p>
      </div>

      {/* Controls */}
      <div className={`${themeClasses.card} p-4`}>
        <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4">
          <div className="hidden lg:flex items-center space-x-2">
            <span className="text-sm font-semibold text-gray-700">View:</span>
            <div className={`flex bg-gradient-to-r ${currentTheme.colors.gradients.background} rounded-xl p-1`}>
              <button 
                onClick={() => dispatch(setViewMode("grid"))}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  viewMode === "grid" 
                    ? `bg-gradient-to-r ${currentTheme.colors.gradients.primary} text-white shadow-md` 
                    : `${themeClasses.primaryText} hover:bg-white/50`
                }`}
              >
                🔳 Grid
              </button>
              <button 
                onClick={() => dispatch(setViewMode("list"))}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  viewMode === "list" 
                    ? `bg-gradient-to-r ${currentTheme.colors.gradients.primary} text-white shadow-md` 
                    : `${themeClasses.primaryText} hover:bg-white/50`
                }`}
              >
                📋 List
              </button>
            </div>
          </div>
          
          <Link 
            to="/writing/create"
            className={`bg-gradient-to-r ${currentTheme.colors.gradients.secondary} text-white px-4 py-3 rounded-2xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 flex items-center justify-center space-x-2 text-sm w-full lg:w-auto lg:whitespace-nowrap`}
          >
            <span>✨ Write New Story</span>
          </Link>
        </div>
      </div>

      {/* Empty State */}
      {writings.length === 0 && (
        <div className={`text-center py-16 bg-gradient-to-br ${currentTheme.colors.gradients.background} rounded-3xl border-2 border-white/20`}>
          <div className="text-6xl mb-4">{themeIcons.writing}</div>
          <h3 className={`text-2xl font-bold text-white mb-2`}>No stories yet!</h3>
          <p className="text-white/80 mb-6">Ready to write your first amazing story?</p>
          <Link 
            to="/writing/create"
            className={`inline-flex items-center space-x-2 bg-gradient-to-r ${currentTheme.colors.gradients.primary} text-white px-8 py-4 rounded-2xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105`}
          >
            <span>{currentTheme.name === 'universe' ? '🚀 Start Writing!' : '🦕 Start Writing!'}</span>
          </Link>
        </div>
      )}

      {/* Writing List */}
      {writings.length > 0 && (
        <>
          {(viewMode === "grid" || window.innerWidth < 1024) ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6">
              {writings.map((w) => (
                <Link
                  key={w._id}
                  to={`/writing/${w._id}`}
                  className={`group ${themeClasses.card} p-6 hover:shadow-xl transition-all duration-300 transform hover:scale-105 hover:brightness-105`}
                >
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <h3 className={`text-lg font-bold text-gray-800 group-hover:${themeClasses.primaryText.replace('text-', '')} line-clamp-2 flex-1`}>
                        {w.title}
                      </h3>
                      <span className="text-2xl group-hover:animate-bounce">{themeIcons.writing}</span>
                    </div>
                    
                    <div className="flex items-center space-x-2 text-sm text-gray-500">
                      <span>📅</span>
                      <span>{new Date(w.date).toLocaleDateString()}</span>
                      {w.overall_score && (
                        <>
                          <span className="text-gray-300">•</span>
                          <span className="flex items-center space-x-1">
                            <span>{themeIcons.success}</span>
                            <span className={`font-semibold ${themeClasses.primaryText}`}>{w.overall_score}/10</span>
                          </span>
                        </>
                      )}
                    </div>
                    
                    <p className="text-gray-600 text-sm leading-relaxed line-clamp-3">
                      {w.text.slice(0, 120)}...
                    </p>
                    
                    <div className={`pt-2 border-t border-gray-100`}>
                      <span className={`${themeClasses.primaryText} text-sm font-medium group-hover:brightness-125`}>
                        Read more →
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {writings.map((w) => (
                <Link
                  key={w._id}
                  to={`/writing/${w._id}`}
                  className={`group block ${themeClasses.card} p-6 hover:shadow-xl transition-all duration-300 transform hover:scale-102 hover:brightness-105`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center space-x-3">
                        <h3 className={`text-xl font-bold text-gray-800 group-hover:${themeClasses.primaryText.replace('text-', '')}`}>
                          {w.title}
                        </h3>
                        {w.overall_score && (
                          <div className={`flex items-center space-x-1 bg-gradient-to-r ${currentTheme.colors.gradients.background} px-2 py-1 rounded-full`}>
                            <span className="text-sm">{themeIcons.success}</span>
                            <span className={`text-sm font-semibold ${themeClasses.primaryText}`}>{w.overall_score}/10</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <div className="flex items-center space-x-1">
                          <span>📅</span>
                          <span>{new Date(w.date).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <span>📝</span>
                          <span>{w.text.length} characters</span>
                        </div>
                      </div>
                      
                      <p className="text-gray-600 line-clamp-2">
                        {w.text.slice(0, 150)}...
                      </p>
                    </div>
                    
                    <div className="ml-4 text-3xl group-hover:animate-bounce">
                      {themeIcons.writing}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default WritingListPage;
