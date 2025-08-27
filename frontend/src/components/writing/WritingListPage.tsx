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

function WritingListPage() {
  const dispatch = useDispatch<AppDispatch>();
  const writings = useSelector(selectWritings);
  const loading = useSelector(selectWritingLoading);
  const viewMode = useSelector(selectWritingViewMode);

  useEffect(() => {
    dispatch(fetchWritings());
  }, [dispatch]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-96 space-y-4">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-500 rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-2xl">📚</span>
          </div>
        </div>
        <p className="text-lg font-semibold text-purple-600">Loading your amazing stories...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
          📖 My Story Collection
        </h1>
        <p className="text-gray-600">All your wonderful stories in one place!</p>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white rounded-2xl p-4 shadow-lg border-2 border-purple-100">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-semibold text-gray-700">View:</span>
          <div className="flex bg-purple-50 rounded-xl p-1">
            <button 
              onClick={() => dispatch(setViewMode("grid"))}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                viewMode === "grid" 
                  ? "bg-purple-500 text-white shadow-md" 
                  : "text-purple-600 hover:bg-purple-100"
              }`}
            >
              🔳 Grid
            </button>
            <button 
              onClick={() => dispatch(setViewMode("list"))}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                viewMode === "list" 
                  ? "bg-purple-500 text-white shadow-md" 
                  : "text-purple-600 hover:bg-purple-100"
              }`}
            >
              📋 List
            </button>
          </div>
        </div>
        
        <Link 
          to="/writing/create"
          className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-6 py-3 rounded-2xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 flex items-center space-x-2"
        >
          <span>✨ Write New Story</span>
        </Link>
      </div>

      {/* Empty State */}
      {writings.length === 0 && (
        <div className="text-center py-16 bg-gradient-to-br from-purple-50 to-pink-50 rounded-3xl border-2 border-purple-100">
          <div className="text-6xl mb-4">📝</div>
          <h3 className="text-2xl font-bold text-purple-600 mb-2">No stories yet!</h3>
          <p className="text-gray-600 mb-6">Ready to write your first amazing story?</p>
          <Link 
            to="/writing/create"
            className="inline-flex items-center space-x-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-8 py-4 rounded-2xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
          >
            <span>🚀 Start Writing!</span>
          </Link>
        </div>
      )}

      {/* Writing List */}
      {writings.length > 0 && (
        <>
          {viewMode === "grid" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {writings.map((w) => (
                <Link
                  key={w._id}
                  to={`/writing/${w._id}`}
                  className="group bg-white border-2 border-purple-100 rounded-3xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 hover:border-purple-300"
                >
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <h3 className="text-lg font-bold text-gray-800 group-hover:text-purple-600 line-clamp-2 flex-1">
                        {w.title}
                      </h3>
                      <span className="text-2xl group-hover:animate-bounce">📚</span>
                    </div>
                    
                    <div className="flex items-center space-x-2 text-sm text-gray-500">
                      <span>📅</span>
                      <span>{new Date(w.date).toLocaleDateString()}</span>
                      {w.overall_score && (
                        <>
                          <span className="text-purple-300">•</span>
                          <span className="flex items-center space-x-1">
                            <span>⭐</span>
                            <span className="font-semibold text-purple-600">{w.overall_score}/10</span>
                          </span>
                        </>
                      )}
                    </div>
                    
                    <p className="text-gray-600 text-sm leading-relaxed line-clamp-3">
                      {w.text.slice(0, 120)}...
                    </p>
                    
                    <div className="pt-2 border-t border-purple-100">
                      <span className="text-purple-500 text-sm font-medium group-hover:text-purple-700">
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
                  className="group block bg-white border-2 border-purple-100 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:border-purple-300"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center space-x-3">
                        <h3 className="text-xl font-bold text-gray-800 group-hover:text-purple-600">
                          {w.title}
                        </h3>
                        {w.overall_score && (
                          <div className="flex items-center space-x-1 bg-purple-50 px-2 py-1 rounded-full">
                            <span className="text-sm">⭐</span>
                            <span className="text-sm font-semibold text-purple-600">{w.overall_score}/10</span>
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
                      📖
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
