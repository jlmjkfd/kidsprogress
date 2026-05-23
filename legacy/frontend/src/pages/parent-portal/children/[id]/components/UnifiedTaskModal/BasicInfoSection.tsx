/**
 * BasicInfoSection - Title, Description, and Collection fields
 */
import { useTranslation } from "react-i18next";

interface TaskCollection {
  _id: string;
  name: string;
}

interface BasicInfoSectionProps {
  title: string;
  description: string;
  collectionId: string;
  isEditMode: boolean;
  isTemplateMode?: boolean;
  collections?: TaskCollection[];
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onCollectionChange: (value: string) => void;
  disabledFields?: {
    title?: boolean;
    collection?: boolean;
  };
}

export function BasicInfoSection({
  title,
  description,
  collectionId,
  isEditMode,
  isTemplateMode,
  collections,
  onTitleChange,
  onDescriptionChange,
  onCollectionChange,
  disabledFields,
}: BasicInfoSectionProps) {
  const { t } = useTranslation(["tasks", "common"]);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">
        {t("tasks:unified_model.basic_info")}
      </h3>

      {/* Title */}
      <div>
        <label
          htmlFor="title"
          className="mb-2 block text-sm font-medium text-gray-700"
        >
          {t("tasks:task_title")} <span className="text-red-500">*</span>
          {isTemplateMode && (
            <span className="ml-2 text-xs text-purple-600">
              ({t("tasks:templates.from_template")})
            </span>
          )}
        </label>
        <input
          type="text"
          id="title"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          disabled={isTemplateMode || disabledFields?.title}
          className={`w-full rounded-lg border px-3 py-2 ${
            isTemplateMode || disabledFields?.title
              ? "bg-gray-50 text-gray-600 cursor-not-allowed border-gray-200"
              : "border-gray-300"
          }`}
          required
          maxLength={200}
        />
        {disabledFields?.title && !isTemplateMode && (
          <p className="mt-1 text-xs text-gray-500">
            {t("tasks:title_cannot_change_hint")}
          </p>
        )}
      </div>

      {/* Description */}
      <div>
        <label
          htmlFor="description"
          className="mb-2 block text-sm font-medium text-gray-700"
        >
          {t("tasks:description")}
          {isTemplateMode && (
            <span className="ml-2 text-xs text-purple-600">
              ({t("tasks:templates.from_template")})
            </span>
          )}
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          disabled={isTemplateMode}
          className={`w-full rounded-lg border px-3 py-2 ${
            isTemplateMode
              ? "bg-gray-50 text-gray-600 cursor-not-allowed border-gray-200"
              : "border-gray-300"
          }`}
          rows={3}
        />
      </div>

      {/* Collection (only for new tasks) */}
      {!isEditMode && collections && collections.length > 0 && (
        <div>
          <label
            htmlFor="collection"
            className="mb-2 block text-sm font-medium text-gray-700"
          >
            {t("common:collection")} <span className="text-red-500">*</span>
          </label>
          <select
            id="collection"
            value={collectionId}
            onChange={(e) => onCollectionChange(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2"
            required
          >
            <option value="">{t("common:select")}</option>
            {collections.map((col) => (
              <option key={col._id} value={col._id}>
                {col.name}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
