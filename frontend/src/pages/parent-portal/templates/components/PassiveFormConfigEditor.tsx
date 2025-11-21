import { useState } from "react";
import { useTranslation } from "react-i18next";
import { IconPlus, IconTrash, IconGripVertical } from "@tabler/icons-react";
import type { PassiveFormConfig, FormField } from "@/types/template";

interface PassiveFormConfigEditorProps {
  config: PassiveFormConfig;
  onChange: (config: PassiveFormConfig) => void;
}

export default function PassiveFormConfigEditor({
  config,
  onChange,
}: PassiveFormConfigEditorProps) {
  const { t } = useTranslation(["tasks", "common"]);
  const [editingField, setEditingField] = useState<FormField | null>(null);
  const [showAddField, setShowAddField] = useState(false);

  const handleAddField = () => {
    const newField: FormField = {
      field_id: `field_${Date.now()}`,
      field_type: "text",
      label: "",
      required: false,
    };
    setEditingField(newField);
    setShowAddField(true);
  };

  const handleSaveField = () => {
    if (!editingField || !editingField.label.trim()) return;

    const existingIndex = config.fields.findIndex(
      (f) => f.field_id === editingField.field_id
    );

    let updatedFields: FormField[];
    if (existingIndex >= 0) {
      updatedFields = [...config.fields];
      updatedFields[existingIndex] = editingField;
    } else {
      updatedFields = [...config.fields, editingField];
    }

    onChange({ ...config, fields: updatedFields });
    setEditingField(null);
    setShowAddField(false);
  };

  const handleEditField = (field: FormField) => {
    setEditingField({ ...field });
    setShowAddField(true);
  };

  const handleDeleteField = (fieldId: string) => {
    onChange({
      ...config,
      fields: config.fields.filter((f) => f.field_id !== fieldId),
    });
  };

  const handleCancel = () => {
    setEditingField(null);
    setShowAddField(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-700">
          {t("tasks:templates.form_fields")}
        </h3>
        <button
          onClick={handleAddField}
          className="flex items-center gap-1 px-3 py-1 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100"
        >
          <IconPlus size={16} />
          <span>{t("tasks:templates.add_field")}</span>
        </button>
      </div>

      {/* Fields List */}
      <div className="space-y-2">
        {config.fields.map((field, index) => (
          <div
            key={field.field_id}
            className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border"
          >
            <IconGripVertical size={16} className="text-gray-400" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-900">{field.label}</span>
                {field.required && (
                  <span className="text-xs text-red-600">*</span>
                )}
              </div>
              <div className="text-xs text-gray-500">
                {t(`tasks:templates.field_types.${field.field_type}`)}
              </div>
            </div>
            <button
              onClick={() => handleEditField(field)}
              className="p-2 text-gray-600 hover:bg-white rounded-lg"
            >
              {t("common:edit")}
            </button>
            <button
              onClick={() => handleDeleteField(field.field_id)}
              className="p-2 text-red-600 hover:bg-white rounded-lg"
            >
              <IconTrash size={16} />
            </button>
          </div>
        ))}

        {config.fields.length === 0 && !showAddField && (
          <div className="text-center py-8 text-gray-500 text-sm">
            {t("tasks:templates.no_fields")}
          </div>
        )}
      </div>

      {/* Field Editor */}
      {showAddField && editingField && (
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 space-y-4">
          <h4 className="font-medium text-gray-900">
            {config.fields.find((f) => f.field_id === editingField.field_id)
              ? t("tasks:templates.edit_field")
              : t("tasks:templates.add_field")}
          </h4>

          {/* Field Label */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("tasks:templates.field_label")}
            </label>
            <input
              type="text"
              value={editingField.label}
              onChange={(e) =>
                setEditingField({ ...editingField, label: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder={t("tasks:templates.field_label_placeholder")}
            />
          </div>

          {/* Field Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("tasks:templates.field_type")}
            </label>
            <select
              value={editingField.field_type}
              onChange={(e) =>
                setEditingField({
                  ...editingField,
                  field_type: e.target.value as FormField["field_type"],
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="text">{t("tasks:templates.field_types.text")}</option>
              <option value="number">{t("tasks:templates.field_types.number")}</option>
              <option value="textarea">{t("tasks:templates.field_types.textarea")}</option>
              <option value="select">{t("tasks:templates.field_types.select")}</option>
              <option value="checkbox">{t("tasks:templates.field_types.checkbox")}</option>
            </select>
          </div>

          {/* Options (for select) */}
          {editingField.field_type === "select" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("tasks:templates.field_options")}
              </label>
              <input
                type="text"
                value={editingField.options?.join(", ") || ""}
                onChange={(e) =>
                  setEditingField({
                    ...editingField,
                    options: e.target.value.split(",").map((o) => o.trim()),
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder={t("tasks:templates.field_options_placeholder")}
              />
            </div>
          )}

          {/* Required */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="field_required"
              checked={editingField.required}
              onChange={(e) =>
                setEditingField({ ...editingField, required: e.target.checked })
              }
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="field_required" className="text-sm text-gray-700">
              {t("tasks:templates.field_required")}
            </label>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <button
              onClick={handleSaveField}
              disabled={!editingField.label.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t("common:save")}
            </button>
            <button
              onClick={handleCancel}
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              {t("common:cancel")}
            </button>
          </div>
        </div>
      )}

      {/* Configuration Options */}
      <div className="space-y-3 pt-4 border-t">
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="allow_photos"
            checked={config.allow_photos}
            onChange={(e) => onChange({ ...config, allow_photos: e.target.checked })}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <label htmlFor="allow_photos" className="text-sm text-gray-700">
            {t("tasks:templates.allow_photos")}
          </label>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="allow_notes"
            checked={config.allow_notes}
            onChange={(e) => onChange({ ...config, allow_notes: e.target.checked })}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <label htmlFor="allow_notes" className="text-sm text-gray-700">
            {t("tasks:templates.allow_notes")}
          </label>
        </div>
      </div>
    </div>
  );
}
