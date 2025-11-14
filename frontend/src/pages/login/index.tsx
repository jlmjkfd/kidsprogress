/**
 * Login page with i18n support
 */
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { IconLogin, IconAlertCircle } from "@tabler/icons-react";
import { useLogin } from "@api/mutations/useLogin";
import { useAppDispatch } from "@store/hooks";
import { setCredentials } from "@store/slices/authSlice";
import { useCurrentUser } from "@api/queries/useCurrentUser";
import { useDevices } from "@api/queries/useDevices";
import LanguageSwitcher from "@components/LanguageSwitcher";
import DeviceRegistrationModal from "@components/DeviceRegistrationModal";
import { getDeviceToken } from "@/utils/deviceToken";

function LoginPage() {
  const { t } = useTranslation(["auth", "errors"]);
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Initialize checkbox from localStorage, default to true if not set
  const savedPreference = localStorage.getItem("login_trusted_device_preference");
  const [isTrustedDevice, setIsTrustedDevice] = useState(
    savedPreference !== null ? JSON.parse(savedPreference) : true
  );
  const [showDeviceRegistration, setShowDeviceRegistration] = useState(false);

  const loginMutation = useLogin();
  const { refetch: fetchCurrentUser } = useCurrentUser(false);
  const { refetch: fetchDevices } = useDevices();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    loginMutation.mutate(
      { email, password, is_trusted_device: isTrustedDevice },
      {
        onSuccess: async (tokenData) => {
          // Store tokens in localStorage
          localStorage.setItem("auth_token", tokenData.access_token);
          localStorage.setItem("refresh_token", tokenData.refresh_token);

          // Fetch current user
          const { data: user } = await fetchCurrentUser();

          if (user) {
            // Store credentials in Redux
            dispatch(setCredentials({ token: tokenData.access_token, user }));

            // Check if current device is registered and active
            if (isTrustedDevice) {
              const currentDeviceToken = getDeviceToken();
              const { data: devices } = await fetchDevices();
              const currentDevice = devices?.find((d) => d.device_token === currentDeviceToken);
              const isDeviceActivelyRegistered = currentDevice && currentDevice.is_active;

              if (!isDeviceActivelyRegistered) {
                // Show registration modal if device not registered or inactive
                setShowDeviceRegistration(true);
              } else {
                // Navigate to portal selection if already registered
                navigate("/portal-selection");
              }
            } else {
              // Navigate directly if not trusted device
              navigate("/portal-selection");
            }
          }
        },
        // onError: (error) => {
        //   console.error("Login failed:", error);
        // },
      }
    );
  };

  const handleInputChange =
    (setter: (value: string) => void) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setter(e.target.value);
    };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="fixed top-4 right-4">
        <LanguageSwitcher />
      </div>
      <div className="w-full max-w-md">
        <div className="rounded-lg bg-white p-8 shadow-md">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold text-gray-900">
              {t("auth:login.title")}
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              {t("auth:login.subtitle")}
            </p>
          </div>

          {loginMutation.isError && (
            <div className="mb-4 flex items-center gap-2 rounded-md bg-red-50 p-3 text-sm text-red-800">
              <IconAlertCircle className="h-5 w-5" />
              <span>{t("errors:invalid_credentials")}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700"
              >
                {t("auth:login.email_label")}
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={handleInputChange(setEmail)}
                required
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                placeholder={t("auth:login.email_placeholder")}
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700"
              >
                {t("auth:login.password_label")}
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={handleInputChange(setPassword)}
                required
                minLength={6}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                placeholder={t("auth:login.password_placeholder")}
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="trustedDevice"
                  checked={isTrustedDevice}
                  onChange={(e) => {
                    const newValue = e.target.checked;
                    setIsTrustedDevice(newValue);
                    localStorage.setItem("login_trusted_device_preference", JSON.stringify(newValue));
                  }}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label
                  htmlFor="trustedDevice"
                  className="ml-2 text-sm font-medium text-gray-700"
                >
                  {t("auth:login.trusted_device")}
                </label>
              </div>
              <p className="ml-6 text-xs text-gray-500">
                {t("auth:login.trusted_device_hint")}
              </p>
            </div>

            <button
              type="submit"
              disabled={loginMutation.isPending}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none disabled:opacity-50"
            >
              {loginMutation.isPending ? (
                <span>{t("auth:login.submitting")}</span>
              ) : (
                <>
                  <IconLogin className="h-5 w-5" />
                  <span>{t("auth:login.submit")}</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-sm">
            <span className="text-gray-600">{t("auth:login.no_account")} </span>
            <Link
              to="/register"
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              {t("auth:login.signup_link")}
            </Link>
          </div>
        </div>
      </div>

      {/* Device Registration Modal */}
      <DeviceRegistrationModal
        isOpen={showDeviceRegistration}
        onClose={() => {
          setShowDeviceRegistration(false);
          navigate("/portal-selection");
        }}
        isTrustedDevice={isTrustedDevice}
      />
    </div>
  );
}

export default LoginPage;
