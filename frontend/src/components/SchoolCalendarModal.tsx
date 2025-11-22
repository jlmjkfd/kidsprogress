/**
 * SchoolCalendarModal - Manage school terms and special days
 */
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  IconX,
  IconPlus,
  IconEdit,
  IconTrash,
  IconCalendar,
  IconSchool,
} from "@tabler/icons-react";
import { useTerms, useSpecialDays } from "@/api/queries/useSchoolCalendar";
import {
  useCreateTerm,
  useUpdateTerm,
  useDeleteTerm,
  useCreateSpecialDay,
  useUpdateSpecialDay,
  useDeleteSpecialDay,
} from "@/api/mutations/useSchoolCalendarMutations";
import { Term, TermCreate, SpecialDay, SpecialDayCreate, SpecialDayUpdate, TermUpdate, WEEKDAY_NAMES } from "@/types/schoolCalendar";
import { UseMutationResult } from "@tanstack/react-query";

interface SchoolCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  childId: string;
}

type TabType = "terms" | "special_days";

export function SchoolCalendarModal({ isOpen, onClose, childId }: SchoolCalendarModalProps) {
  const { t } = useTranslation(["tasks", "common"]);
  const [activeTab, setActiveTab] = useState<TabType>("terms");
  const [showTermForm, setShowTermForm] = useState(false);
  const [showSpecialDayForm, setShowSpecialDayForm] = useState(false);
  const [editingTerm, setEditingTerm] = useState<Term | null>(null);
  const [editingSpecialDay, setEditingSpecialDay] = useState<SpecialDay | null>(null);

  // Fetch data
  const { data: terms } = useTerms(childId);
  const { data: specialDays } = useSpecialDays(childId);

  // Mutations
  const createTermMutation = useCreateTerm();
  const updateTermMutation = useUpdateTerm();
  const deleteTermMutation = useDeleteTerm();
  const createSpecialDayMutation = useCreateSpecialDay();
  const updateSpecialDayMutation = useUpdateSpecialDay();
  const deleteSpecialDayMutation = useDeleteSpecialDay();

  const handleAddTerm = () => {
    setEditingTerm(null);
    setShowTermForm(true);
  };

  const handleEditTerm = (term: Term) => {
    setEditingTerm(term);
    setShowTermForm(true);
  };

  const handleDeleteTerm = async (termId: string) => {
    if (confirm(t("tasks:school_calendar.confirm_delete_term"))) {
      await deleteTermMutation.mutateAsync({ termId, childId });
    }
  };

  const handleAddSpecialDay = () => {
    setEditingSpecialDay(null);
    setShowSpecialDayForm(true);
  };

  const handleEditSpecialDay = (day: SpecialDay) => {
    setEditingSpecialDay(day);
    setShowSpecialDayForm(true);
  };

  const handleDeleteSpecialDay = async (dayId: string) => {
    if (confirm(t("tasks:school_calendar.confirm_delete_special_day"))) {
      await deleteSpecialDayMutation.mutateAsync({ dayId, childId });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <IconSchool size={28} />
            {t("tasks:school_calendar.title")}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Close"
          >
            <IconX size={24} />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b">
          <div className="flex">
            <button
              onClick={() => setActiveTab("terms")}
              className={`flex-1 px-6 py-3 font-medium transition-colors ${
                activeTab === "terms"
                  ? "border-b-2 border-blue-600 text-blue-600"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              {t("tasks:school_calendar.terms")}
            </button>
            <button
              onClick={() => setActiveTab("special_days")}
              className={`flex-1 px-6 py-3 font-medium transition-colors ${
                activeTab === "special_days"
                  ? "border-b-2 border-blue-600 text-blue-600"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              {t("tasks:school_calendar.special_days")}
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === "terms" && (
            <TermsTab
              terms={terms || []}
              onAdd={handleAddTerm}
              onEdit={handleEditTerm}
              onDelete={handleDeleteTerm}
              showForm={showTermForm}
              setShowForm={setShowTermForm}
              editingTerm={editingTerm}
              childId={childId}
              createMutation={createTermMutation}
              updateMutation={updateTermMutation}
            />
          )}

          {activeTab === "special_days" && (
            <SpecialDaysTab
              specialDays={specialDays || []}
              onAdd={handleAddSpecialDay}
              onEdit={handleEditSpecialDay}
              onDelete={handleDeleteSpecialDay}
              showForm={showSpecialDayForm}
              setShowForm={setShowSpecialDayForm}
              editingSpecialDay={editingSpecialDay}
              childId={childId}
              createMutation={createSpecialDayMutation}
              updateMutation={updateSpecialDayMutation}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// Terms Tab Component
interface TermsTabProps {
  terms: Term[];
  onAdd: () => void;
  onEdit: (term: Term) => void;
  onDelete: (termId: string) => void;
  showForm: boolean;
  setShowForm: (show: boolean) => void;
  editingTerm: Term | null;
  childId: string;
  createMutation: UseMutationResult<Term, Error, TermCreate>;
  updateMutation: UseMutationResult<Term, Error, { termId: string; data: TermUpdate }>;
}

function TermsTab({
  terms,
  onAdd,
  onEdit,
  onDelete,
  showForm,
  setShowForm,
  editingTerm,
  childId,
  createMutation,
  updateMutation,
}: TermsTabProps) {
  const { t } = useTranslation(["tasks", "common"]);
  const [formData, setFormData] = useState({
    name: "",
    start_date: "",
    end_date: "",
    school_weekdays: [0, 1, 2, 3, 4], // Mon-Fri default
  });

  const resetForm = () => {
    setFormData({
      name: "",
      start_date: "",
      end_date: "",
      school_weekdays: [0, 1, 2, 3, 4],
    });
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingTerm) {
      await updateMutation.mutateAsync({
        termId: editingTerm._id,
        data: formData,
      });
    } else {
      await createMutation.mutateAsync({
        child_id: childId,
        ...formData,
      });
    }
    resetForm();
  };

  const toggleWeekday = (day: number) => {
    setFormData((prev) => ({
      ...prev,
      school_weekdays: prev.school_weekdays.includes(day)
        ? prev.school_weekdays.filter((d) => d !== day)
        : [...prev.school_weekdays, day],
    }));
  };

  // Load editing data
  if (showForm && editingTerm && formData.name === "") {
    setFormData({
      name: editingTerm.name,
      start_date: editingTerm.start_date,
      end_date: editingTerm.end_date,
      school_weekdays: editingTerm.school_weekdays,
    });
  }

  return (
    <div className="space-y-4">
      {!showForm && (
        <button
          onClick={onAdd}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <IconPlus size={20} />
          {t("tasks:school_calendar.add_term")}
        </button>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-gray-50 p-4 rounded-lg space-y-4">
          <h3 className="font-semibold text-gray-900">
            {editingTerm ? t("tasks:school_calendar.edit_term") : t("tasks:school_calendar.add_term")}
          </h3>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("tasks:school_calendar.term_name")}
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="e.g., Fall 2024"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("tasks:school_calendar.start_date")}
              </label>
              <input
                type="date"
                required
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("tasks:school_calendar.end_date")}
              </label>
              <input
                type="date"
                required
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t("tasks:school_calendar.select_school_days")}
            </label>
            <div className="flex gap-2">
              {WEEKDAY_NAMES.map((day, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => toggleWeekday(index)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    formData.school_weekdays.includes(index)
                      ? "bg-blue-600 text-white"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                >
                  {day.substring(0, 3)}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {editingTerm ? t("common:save") : t("common:create")}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              {t("common:cancel")}
            </button>
          </div>
        </form>
      )}

      {/* Terms List */}
      <div className="space-y-2">
        {terms.length === 0 ? (
          <p className="text-gray-500 text-center py-8">{t("tasks:school_calendar.no_terms")}</p>
        ) : (
          terms.map((term: Term) => (
            <div
              key={term._id}
              className="bg-white border border-gray-200 rounded-lg p-4 flex items-center justify-between"
            >
              <div>
                <h4 className="font-semibold text-gray-900">{term.name}</h4>
                <p className="text-sm text-gray-600">
                  {new Date(term.start_date).toLocaleDateString()} -{" "}
                  {new Date(term.end_date).toLocaleDateString()}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  School days: {term.school_weekdays.map((d) => WEEKDAY_NAMES[d].substring(0, 3)).join(", ")}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => onEdit(term)}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title={t("common:edit")}
                >
                  <IconEdit size={18} />
                </button>
                <button
                  onClick={() => onDelete(term._id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title={t("common:delete")}
                >
                  <IconTrash size={18} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// Special Days Tab Component
interface SpecialDaysTabProps {
  specialDays: SpecialDay[];
  onAdd: () => void;
  onEdit: (day: SpecialDay) => void;
  onDelete: (dayId: string) => void;
  showForm: boolean;
  setShowForm: (show: boolean) => void;
  editingSpecialDay: SpecialDay | null;
  childId: string;
  createMutation: UseMutationResult<SpecialDay, Error, SpecialDayCreate>;
  updateMutation: UseMutationResult<SpecialDay, Error, { dayId: string; data: SpecialDayUpdate }>;
}

function SpecialDaysTab({
  specialDays,
  onAdd,
  onEdit,
  onDelete,
  showForm,
  setShowForm,
  editingSpecialDay,
  childId,
  createMutation,
  updateMutation,
}: SpecialDaysTabProps) {
  const { t } = useTranslation(["tasks", "common"]);
  const [formData, setFormData] = useState({
    date: "",
    day_type: "holiday" as "holiday" | "special_school_day",
    name: "",
    description: "",
  });

  const resetForm = () => {
    setFormData({
      date: "",
      day_type: "holiday",
      name: "",
      description: "",
    });
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingSpecialDay) {
      await updateMutation.mutateAsync({
        dayId: editingSpecialDay._id,
        data: formData,
      });
    } else {
      await createMutation.mutateAsync({
        child_id: childId,
        ...formData,
      });
    }
    resetForm();
  };

  // Load editing data
  if (showForm && editingSpecialDay && formData.name === "") {
    setFormData({
      date: editingSpecialDay.date,
      day_type: editingSpecialDay.day_type,
      name: editingSpecialDay.name,
      description: editingSpecialDay.description || "",
    });
  }

  return (
    <div className="space-y-4">
      {!showForm && (
        <button
          onClick={onAdd}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <IconPlus size={20} />
          {t("tasks:school_calendar.add_special_day")}
        </button>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-gray-50 p-4 rounded-lg space-y-4">
          <h3 className="font-semibold text-gray-900">
            {editingSpecialDay
              ? t("tasks:school_calendar.edit_special_day")
              : t("tasks:school_calendar.add_special_day")}
          </h3>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("common:date")}
            </label>
            <input
              type="date"
              required
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("tasks:school_calendar.day_type")}
            </label>
            <select
              value={formData.day_type}
              onChange={(e) =>
                setFormData({ ...formData, day_type: e.target.value as "holiday" | "special_school_day" })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="holiday">{t("tasks:school_calendar.holiday")}</option>
              <option value="special_school_day">{t("tasks:school_calendar.special_school_day")}</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("common:name")}
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="e.g., Christmas Day"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("tasks:school_calendar.description")} ({t("common:optional")})
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              rows={2}
            />
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {editingSpecialDay ? t("common:save") : t("common:create")}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              {t("common:cancel")}
            </button>
          </div>
        </form>
      )}

      {/* Special Days List */}
      <div className="space-y-2">
        {specialDays.length === 0 ? (
          <p className="text-gray-500 text-center py-8">{t("tasks:school_calendar.no_special_days")}</p>
        ) : (
          specialDays
            .sort((a: SpecialDay, b: SpecialDay) => new Date(a.date).getTime() - new Date(b.date).getTime())
            .map((day: SpecialDay) => (
              <div
                key={day._id}
                className={`border rounded-lg p-4 flex items-center justify-between ${
                  day.day_type === "holiday" ? "bg-green-50 border-green-200" : "bg-purple-50 border-purple-200"
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-gray-900">{day.name}</h4>
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium ${
                        day.day_type === "holiday"
                          ? "bg-green-100 text-green-700"
                          : "bg-purple-100 text-purple-700"
                      }`}
                    >
                      {t(`tasks:school_calendar.${day.day_type}`)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    <IconCalendar size={14} className="inline mr-1" />
                    {new Date(day.date).toLocaleDateString()}
                  </p>
                  {day.description && <p className="text-xs text-gray-500 mt-1">{day.description}</p>}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => onEdit(day)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title={t("common:edit")}
                  >
                    <IconEdit size={18} />
                  </button>
                  <button
                    onClick={() => onDelete(day._id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title={t("common:delete")}
                  >
                    <IconTrash size={18} />
                  </button>
                </div>
              </div>
            ))
        )}
      </div>
    </div>
  );
}
