/**
 * Template Hub - Main entry point for template management
 */
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  IconTemplate,
  IconBook,
  IconBookmark,
  IconArrowRight,
} from "@tabler/icons-react";
import { useMyTemplates } from "@/api/templateLibrary";

export default function TemplatesPage() {
  const { t } = useTranslation(["templates", "common"]);
  const navigate = useNavigate();
  const { data: myTemplates = [] } = useMyTemplates();

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center shadow-lg">
          <IconTemplate size={24} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            {t("templates:hub.title")}
          </h1>
          <p className="text-sm text-gray-500">
            {t("templates:hub.subtitle")}
          </p>
        </div>
      </div>

      {/* Quick Access Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Template Library Card */}
        <button
          onClick={() => navigate("/parent-portal/templates/library")}
          className="bg-white border-2 border-gray-200 rounded-xl p-6 hover:border-blue-500 hover:shadow-lg transition-all text-left group"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center group-hover:bg-blue-500 transition-colors">
              <IconBook
                size={28}
                className="text-blue-600 group-hover:text-white transition-colors"
              />
            </div>
            <IconArrowRight className="w-5 h-5 text-gray-400 group-hover:text-blue-500 transition-colors" />
          </div>

          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            {t("templates:hub.libraryTitle")}
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            {t("templates:hub.libraryDescription")}
          </p>

          <div className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 group-hover:text-blue-700">
            {t("templates:hub.browseTemplates")}
            <IconArrowRight className="w-4 h-4" />
          </div>
        </button>

        {/* My Templates Card */}
        <button
          onClick={() => navigate("/parent-portal/templates/my-templates")}
          className="bg-white border-2 border-gray-200 rounded-xl p-6 hover:border-purple-500 hover:shadow-lg transition-all text-left group"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="w-14 h-14 bg-purple-100 rounded-xl flex items-center justify-center group-hover:bg-purple-500 transition-colors">
              <IconBookmark
                size={28}
                className="text-purple-600 group-hover:text-white transition-colors"
              />
            </div>
            <IconArrowRight className="w-5 h-5 text-gray-400 group-hover:text-purple-500 transition-colors" />
          </div>

          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            {t("templates:hub.myTemplatesTitle")}
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            {t("templates:hub.myTemplatesDescription")}
          </p>

          <div className="flex items-center justify-between">
            <div className="inline-flex items-center gap-2 text-sm font-medium text-purple-600 group-hover:text-purple-700">
              {t("templates:hub.viewMyTemplates")}
              <IconArrowRight className="w-4 h-4" />
            </div>
            {myTemplates.length > 0 && (
              <span className="px-3 py-1 bg-purple-100 text-purple-700 text-sm font-medium rounded-full">
                {myTemplates.length}
              </span>
            )}
          </div>
        </button>
      </div>

      {/* Info Section */}
      <div className="bg-gradient-to-br from-blue-50 to-purple-50 border border-blue-200 rounded-xl p-6">
        <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <IconTemplate className="w-5 h-5 text-blue-600" />
          {t("templates:hub.howToUseTitle")}
        </h3>
        <div className="space-y-2 text-sm text-gray-700">
          <p className="flex items-start gap-2">
            <span className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold">
              1
            </span>
            <span>{t("templates:hub.step1")}</span>
          </p>
          <p className="flex items-start gap-2">
            <span className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold">
              2
            </span>
            <span>{t("templates:hub.step2")}</span>
          </p>
          <p className="flex items-start gap-2">
            <span className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold">
              3
            </span>
            <span>{t("templates:hub.step3")}</span>
          </p>
        </div>
      </div>
    </div>
  );
}
