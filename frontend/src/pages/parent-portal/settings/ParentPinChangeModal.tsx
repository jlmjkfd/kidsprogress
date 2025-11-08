/**
 * Parent Portal PIN Change Modal - Set or Change PIN
 */
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { IconLock, IconAlertCircle, IconX, IconCheck } from "@tabler/icons-react";
import { useSetParentPin } from "@api/mutations/useSetParentPin";

interface ParentPinChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  hasExistingPin: boolean;
}

export default function ParentPinChangeModal({ isOpen, onClose, hasExistingPin }: ParentPinChangeModalProps) {
  const { t } = useTranslation(["auth"]);
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const setPinMutation = useSetParentPin();

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (pin !== confirmPin) {
      return;
    }

    setPinMutation.mutate(
      { pin },
      {
        onSuccess: () => {
          handleClose();
        },
      }
    );
  };

  const handleClose = () => {
    setPin("");
    setConfirmPin("");
    setPinMutation.reset();
    onClose();
  };

  const isPinValid = pin.length >= 4 && pin.length <= 6;
  const pinsMatch = pin === confirmPin && confirmPin.length > 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <IconLock className="text-blue-600" size={24} />
            {hasExistingPin ? t("auth:parent_pin.change_pin") : t("auth:parent_pin.set_pin")}
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1"
            aria-label="Close"
          >
            <IconX size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {(setPinMutation.isError || (pin !== confirmPin && confirmPin.length > 0)) && (
            <div className="flex items-center gap-2 rounded-md bg-red-50 p-3 text-sm text-red-800">
              <IconAlertCircle className="h-5 w-5 flex-shrink-0" />
              <span>
                {setPinMutation.isError
                  ? t("auth:parent_pin.set_error")
                  : t("auth:parent_pin.pins_dont_match")}
              </span>
            </div>
          )}

          <div>
            <label htmlFor="pin" className="block text-sm font-medium text-gray-700 mb-2">
              {t("auth:parent_pin.enter_new_pin")}
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
            <p className="mt-1 text-xs text-gray-500">{t("auth:parent_pin.pin_length")}</p>
          </div>

          <div>
            <label htmlFor="confirmPin" className="block text-sm font-medium text-gray-700 mb-2">
              {t("auth:parent_pin.confirm_pin")}
            </label>
            <div className="relative">
              <input
                id="confirmPin"
                type="password"
                inputMode="numeric"
                pattern="\d*"
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                maxLength={6}
                required
                className="w-full text-center text-2xl tracking-widest px-4 py-3 border border-gray-300 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                placeholder="••••••"
              />
              {pinsMatch && (
                <IconCheck className="absolute right-3 top-1/2 -translate-y-1/2 text-green-600" size={24} />
              )}
            </div>
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
              disabled={!isPinValid || !pinsMatch || setPinMutation.isPending}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {setPinMutation.isPending
                ? t("auth:parent_pin.setting")
                : hasExistingPin
                ? t("auth:parent_pin.change")
                : t("auth:parent_pin.set")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
