import { useDispatch, useSelector } from "react-redux";
import { AppDispatch } from "../../store";
import { Link, useParams } from "react-router-dom";
import {
  fetchWritingById,
  selectWritingDetail,
  selectWritingLoading,
} from "../../store/modules/writingSlice";
import { useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { WritingCriteriaDimension, CriterionScore } from "../../models/Writing";

function WritingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const dispatch = useDispatch<AppDispatch>();
  const writingDetail = useSelector(selectWritingDetail(id));
  const loading = useSelector(selectWritingLoading);

  useEffect(() => {
    if (id && !writingDetail) {
      dispatch(fetchWritingById(id));
    }
  }, [id, writingDetail, dispatch]);

  const getScoreColor = (score: number) => {
    if (score >= 9) return "from-green-400 to-emerald-400";
    if (score >= 7) return "from-yellow-400 to-orange-400";
    if (score >= 5) return "from-orange-400 to-red-400";
    return "from-red-400 to-pink-400";
  };

  const getScoreEmoji = (score: number) => {
    if (score >= 9) return "🏆";
    if (score >= 7) return "⭐";
    if (score >= 5) return "👍";
    return "💪";
  };

  if (!id) {
    return (
      <div className="max-w-4xl mx-auto p-6 text-center">
        <div className="text-6xl mb-4">❓</div>
        <h2 className="text-2xl font-bold text-gray-600">Invalid writing ID</h2>
      </div>
    );
  }

  if (loading && !writingDetail) {
    return (
      <div className="flex flex-col items-center justify-center min-h-96 space-y-4">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-500 rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-2xl">📖</span>
          </div>
        </div>
        <p className="text-lg font-semibold text-purple-600">
          Loading your story...
        </p>
      </div>
    );
  }

  if (!writingDetail) {
    return (
      <div className="max-w-4xl mx-auto p-6 text-center space-y-4">
        <div className="text-6xl mb-4">📭</div>
        <h2 className="text-2xl font-bold text-gray-600">Story not found</h2>
        <Link
          to="/writing"
          className="inline-flex items-center space-x-2 bg-purple-500 text-white px-6 py-3 rounded-2xl font-medium hover:bg-purple-600 transition-colors duration-200"
        >
          <span>← Back to Stories</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Back Button */}
      <Link
        to="/writing"
        className="inline-flex items-center space-x-2 text-purple-600 hover:text-purple-800 font-medium transition-colors duration-200 group"
      >
        <span className="group-hover:-translate-x-1 transition-transform duration-200">
          ←
        </span>
        <span>Back to Stories</span>
      </Link>

      {/* Header */}
      <div className="bg-white rounded-3xl shadow-xl border-2 border-purple-100 overflow-hidden">
        <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h1 className="text-3xl font-bold mb-2">{writingDetail.title}</h1>
              <div className="flex items-center space-x-4 text-purple-100">
                <span>
                  📅 {new Date(writingDetail.date).toLocaleDateString()}
                </span>
                <span>📝 {writingDetail.text.length} characters</span>
              </div>
            </div>
            <div className="text-right">
              {writingDetail.overall_score && (
                <div className="flex items-center space-x-2">
                  <span className="text-2xl">
                    {getScoreEmoji(writingDetail.overall_score)}
                  </span>
                  <div className="text-right">
                    <div className="text-2xl font-bold">
                      {writingDetail.overall_score}/10
                    </div>
                    <div className="text-sm text-purple-100">Overall Score</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Original Story */}
        <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50">
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center space-x-2">
            <span>📖</span>
            <span>Your Original Story</span>
          </h2>
          <div className="bg-white rounded-2xl p-6 shadow-md border border-blue-200">
            <p className="text-gray-700 leading-relaxed whitespace-pre-wrap text-lg">
              {writingDetail.text}
            </p>
          </div>
        </div>
      </div>

      {/* Score Breakdown */}
      {writingDetail.overall_score && (
        <div className="bg-white rounded-3xl shadow-xl border-2 border-green-100 p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center space-x-2">
            <span>🎯</span>
            <span>Your Scores</span>
          </h2>

          <div className="flex justify-center mb-6">
            <div
              className={`bg-gradient-to-r ${getScoreColor(
                writingDetail.overall_score
              )} text-white w-20 h-20 rounded-full flex flex-col items-center justify-center shadow-xl`}
            >
              <span className="text-3xl font-bold">
                {writingDetail.overall_score}
              </span>
              <span className="text-xs">out of 10</span>
            </div>
          </div>

          {/* Rubric Scores */}
          {writingDetail.rubric_scores &&
            Array.isArray(writingDetail.rubric_scores) && (
              <div className="space-y-4">
                {writingDetail.rubric_scores.map(
                  (dimension: WritingCriteriaDimension, index: number) => (
                    <div
                      key={index}
                      className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-4 border border-purple-200"
                    >
                      <h3 className="font-bold text-purple-700 mb-3 flex items-center space-x-2">
                        <span>📊</span>
                        <span>{dimension.dimension}</span>
                      </h3>
                      <div className="space-y-2">
                        {dimension.criteria?.map(
                          (criterion: CriterionScore, criterionIndex: number) => (
                            <div
                              key={criterionIndex}
                              className="bg-white rounded-lg p-3 shadow-sm"
                            >
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-medium text-gray-700">
                                  {criterion.criterion}
                                </span>
                                <div
                                  className={`bg-gradient-to-r ${getScoreColor(
                                    criterion.score
                                  )} text-white px-3 py-1 rounded-full text-sm font-bold`}
                                >
                                  {criterion.score}/10
                                </div>
                              </div>
                              <p className="text-sm text-gray-600">
                                {criterion.reason}
                              </p>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  )
                )}
              </div>
            )}
        </div>
      )}

      {/* Feedback */}
      {writingDetail.feedback_student && (
        <div className="bg-white rounded-3xl shadow-xl border-2 border-yellow-100 p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center space-x-2">
            <span>💬</span>
            <span>Your Teacher's Feedback</span>
          </h2>
          <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-2xl p-6 border border-yellow-200">
            <div className="prose prose-lg max-w-none">
              {/* <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                {writingDetail.feedback_student}
              </p> */}
              <ReactMarkdown
                children={writingDetail.feedback_student || ""}
                components={{
                  p: ({ children }) => (
                    <p className="mb-2 last:mb-0 text-gray-700 text-sm leading-relaxed">
                      {children}
                    </p>
                  ),
                  strong: ({ children }) => (
                    <strong className="text-purple-600 font-semibold">
                      {children}
                    </strong>
                  ),
                  em: ({ children }) => (
                    <em className="text-pink-600">{children}</em>
                  ),
                  ul: ({ children }) => (
                    <ul className="list-disc list-inside space-y-1 text-gray-700">
                      {children}
                    </ul>
                  ),
                  li: ({ children }) => <li className="text-sm">{children}</li>,
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Improved Version */}
      {writingDetail.improved_text && (
        <div className="bg-white rounded-3xl shadow-xl border-2 border-emerald-100 p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center space-x-2">
            <span>✨</span>
            <span>Improved Version</span>
          </h2>
          <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-2xl p-6 border border-emerald-200">
            <p className="text-gray-700 leading-relaxed whitespace-pre-wrap text-lg">
              {writingDetail.improved_text}
            </p>
          </div>
          <div className="mt-4 p-4 bg-blue-50 rounded-2xl border border-blue-200">
            <p className="text-blue-700 text-sm flex items-start space-x-2">
              <span className="text-lg">💡</span>
              <span>
                <strong>Tip:</strong> Compare your original story with this
                improved version to see what makes writing even better! Notice
                how some words and sentences were changed to make the story flow
                more smoothly.
              </span>
            </p>
          </div>
        </div>
      )}

      {/* Encouragement */}
      <div className="bg-gradient-to-r from-pink-50 to-purple-50 rounded-3xl p-6 text-center border-2 border-pink-200">
        <div className="text-4xl mb-3">🌟</div>
        <h3 className="text-xl font-bold text-purple-600 mb-2">
          Keep up the amazing work!
        </h3>
        <p className="text-gray-600 mb-4">
          Every story you write makes you a better writer. You're doing
          fantastic! 🎉
        </p>
        <Link
          to="/writing/create"
          className="inline-flex items-center space-x-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-2xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
        >
          <span>Write Another Story</span>
          <span>✏️</span>
        </Link>
      </div>
    </div>
  );
}
export default WritingDetailPage;
