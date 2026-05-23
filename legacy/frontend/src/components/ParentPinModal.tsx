/**
 * Parent Portal PIN verification modal
 */
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { IconLock, IconAlertCircle, IconX } from "@tabler/icons-react";
import { useVerifyParentPin } from "@api/mutations/useVerifyParentPin";

interface ParentPinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ParentPinModal({ isOpen, onClose, onSuccess }: ParentPinModalProps) {
  const { t } = useTranslation(["auth"]);
  const [pin, setPin] = useState("");
  const verifyPinMutation = useVerifyParentPin();

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    verifyPinMutation.mutate(
      { pin },
      {
        onSuccess: () => {
          setPin("");
          onSuccess();
        },
        onError: () => {
          setPin("");
        },
      }
    );
  };

  const handleClose = () => {
    setPin("");
    verifyPinMutation.reset();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <IconLock className="text-blue-600" size={24} />
            {t("auth:parent_access.title")}
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1"
            aria-label="Close"
          >
            <IconX size={24} />
          </button>
        </div>

        {verifyPinMutation.isError && (
          <div className="mb-4 flex items-center gap-2 rounded-md bg-red-50 p-3 text-sm text-red-800">
            <IconAlertCircle className="h-5 w-5 flex-shrink-0" />
            <span>{t("auth:parent_access.invalid_pin")}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="pin" className="block text-sm font-medium text-gray-700 mb-2">
              {t("auth:parent_access.enter_pin")}
            </label>
            <input
              id="pin"
              type="password"
              inputMode="numeric"
              pattern="\d*"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
              maxLength={6}
              required
              autoFocus
              className="w-full text-center text-2xl tracking-widest px-4 py-3 border border-gray-300 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
              placeholder="••••••"
            />
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
            >
              {t("auth:child_pin.back")}
            </button>
            <button
              type="submit"
              disabled={pin.length < 4 || verifyPinMutation.isPending}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {verifyPinMutation.isPending ? t("auth:parent_access.verifying") : t("auth:parent_access.access")}
            </button>
          </div>

          <div className="text-center">
            <button
              type="button"
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              {t("auth:parent_access.forgot_pin")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
