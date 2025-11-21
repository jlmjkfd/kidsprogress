/**
 * Passive Form Executor Component
 * Allows users to fill out a form after completing a task offline
 */
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { IconPhoto, IconNotes, IconCheck, IconX } from "@tabler/icons-react";
import type { ExecutorProps } from "./types";
import type { FormField } from "../../types/template";

export function PassiveFormExecutor({
  taskId,
  executionData,
  onComplete,
  onCancel,
}: ExecutorProps) {
  const { t } = useTranslation(["tasks", "common"]);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [notes, setNotes] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const fields: FormField[] = executionData.fields || [];
  const allowPhotos = executionData.allow_photos || false;
  const allowNotes = executionData.allow_notes || false;

  const handleFieldChange = (fieldId: string, value: any) => {
    setFormData((prev) => ({ ...prev, [fieldId]: value }));
    // Clear error for this field
    if (errors[fieldId]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[fieldId];
        return newErrors;
      });
    }
  };

  const handlePhotoAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setPhotos((prev) => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const handlePhotoRemove = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Validate required fields
    fields.forEach((field) => {
      if (field.required && !formData[field.field_id]) {
        newErrors[field.field_id] = t("tasks:field_required", {
          field: field.label,
        });
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const uploadPhotos = async (files: File[]): Promise<string[]> => {
    // TODO: Implement actual photo upload to storage
    // For now, return mock URLs
    return files.map((_, index) => `https://storage.example.com/photo${index}.jpg`);
  };

  const handleSubmit = async () => {
    if (!validate()) {
      return;
    }

    setIsSubmitting(true);
    try {
      // Upload photos if any
      const photoUrls = photos.length > 0 ? await uploadPhotos(photos) : [];

      const completionData = {
        form_responses: formData,
        notes: notes || null,
        photos: photoUrls,
        started_at: new Date().toISOString(),
      };

      await onComplete(completionData);
    } catch (error) {
      console.error("Submission error:", error);
      alert(t("common:error_occurred"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderField = (field: FormField) => {
    const value = formData[field.field_id] || "";
    const hasError = !!errors[field.field_id];

    return (
      <div key={field.field_id} className="space-y-1">
        <label className="block text-sm font-medium text-gray-700">
          {field.label}
          {field.required && <span className="text-red-500 ml-1">*</span>}
        </label>

        {field.field_type === "text" && (
          <input
            type="text"
            value={value}
            onChange={(e) => handleFieldChange(field.field_id, e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              hasError ? "border-red-500" : "border-gray-300"
            }`}
          />
        )}

        {field.field_type === "number" && (
          <input
            type="number"
            value={value}
            onChange={(e) => handleFieldChange(field.field_id, e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              hasError ? "border-red-500" : "border-gray-300"
            }`}
          />
        )}

        {field.field_type === "textarea" && (
          <textarea
            value={value}
            onChange={(e) => handleFieldChange(field.field_id, e.target.value)}
            rows={4}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              hasError ? "border-red-500" : "border-gray-300"
            }`}
          />
        )}

        {field.field_type === "select" && (
          <select
            value={value}
            onChange={(e) => handleFieldChange(field.field_id, e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              hasError ? "border-red-500" : "border-gray-300"
            }`}
          >
            <option value="">{t("common:select_option")}</option>
            {field.options?.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        )}

        {field.field_type === "checkbox" && (
          <div className="space-y-2">
            {field.options?.map((opt) => (
              <label key={opt} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={value.includes?.(opt)}
                  onChange={(e) => {
                    const currentValue = value || [];
                    const newValue = e.target.checked
                      ? [...currentValue, opt]
                      : currentValue.filter((v: string) => v !== opt);
                    handleFieldChange(field.field_id, newValue);
                  }}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">{opt}</span>
              </label>
            ))}
          </div>
        )}

        {hasError && (
          <p className="text-sm text-red-500">{errors[field.field_id]}</p>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 p-4 md:p-6">
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h2 className="text-xl md:text-2xl font-bold mb-6">
          {t("tasks:complete_task")}
        </h2>

        {/* Form Fields */}
        <div className="space-y-4 mb-6">{fields.map(renderField)}</div>

        {/* Notes */}
        {allowNotes && (
          <div className="mb-6">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
              <IconNotes size={16} />
              {t("tasks:additional_notes")}
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder={t("tasks:notes_placeholder")}
            />
          </div>
        )}

        {/* Photos */}
        {allowPhotos && (
          <div className="mb-6">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <IconPhoto size={16} />
              {t("tasks:attach_photos")}
            </label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handlePhotoAdd}
              className="block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-lg file:border-0
                file:text-sm file:font-medium
                file:bg-blue-50 file:text-blue-700
                hover:file:bg-blue-100
                cursor-pointer"
            />
            {photos.length > 0 && (
              <div className="mt-3 space-y-2">
                {photos.map((photo, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between bg-gray-50 p-2 rounded-lg"
                  >
                    <span className="text-sm text-gray-600 truncate">
                      {photo.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => handlePhotoRemove(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <IconX size={16} />
                    </button>
                  </div>
                ))}
                <p className="text-sm text-gray-500">
                  {photos.length} {t("tasks:photos_selected")}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-lg hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-sm"
          >
            <IconCheck size={18} />
            {isSubmitting ? t("tasks:submitting") : t("tasks:submit")}
          </button>
          <button
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {t("common:cancel")}
          </button>
        </div>
      </div>
    </div>
  );
}
