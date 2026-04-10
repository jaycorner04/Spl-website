import { useMemo, useState } from "react";
import { CheckCircle2, Eye, EyeOff, ShieldAlert } from "lucide-react";
import DashboardPanel from "../../components/dashboard/DashboardPanel";
import AuthInput from "../../components/auth/AuthInput";
import PasswordRules from "../../components/auth/PasswordRules";
import { changePassword } from "../../api/authAPI";
import { getApiErrorMessage } from "../../utils/apiErrors";
import { validatePassword } from "../../utils/authValidators";

const INITIAL_FORM = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

function ToggleButton({ active, onClick, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
      aria-label={label}
    >
      {active ? "Hide" : "Show"}
    </button>
  );
}

export default function ChangePasswordPage() {
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const passwordState = useMemo(
    () => validatePassword(form.newPassword || ""),
    [form.newPassword]
  );

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({
      ...current,
      [name]: value,
    }));
    setErrors((current) => ({
      ...current,
      [name]: "",
      form: "",
    }));
    setSuccessMessage("");
  };

  const validateForm = () => {
    const nextErrors = {};

    if (!form.currentPassword.trim()) {
      nextErrors.currentPassword = "Please enter your current password.";
    }

    if (!form.newPassword.trim()) {
      nextErrors.newPassword = "Please enter a new password.";
    } else if (!passwordState.isValid) {
      nextErrors.newPassword =
        "Password must be 8+ characters with uppercase, lowercase, number, and special character.";
    } else if (form.newPassword === form.currentPassword) {
      nextErrors.newPassword =
        "New password must be different from the current password.";
    }

    if (!form.confirmPassword.trim()) {
      nextErrors.confirmPassword = "Please confirm the new password.";
    } else if (form.confirmPassword !== form.newPassword) {
      nextErrors.confirmPassword = "Passwords do not match.";
    }

    return nextErrors;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const nextErrors = validateForm();
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    try {
      setIsSubmitting(true);
      setErrors({});
      setSuccessMessage("");

      const response = await changePassword({
        currentPassword: form.currentPassword,
        password: form.newPassword,
      });

      setForm(INITIAL_FORM);
      setSuccessMessage(
        response?.message ||
          "Password updated successfully. Use the new password next time you sign in."
      );
    } catch (requestError) {
      setErrors((current) => ({
        ...current,
        form: getApiErrorMessage(
          requestError,
          "Unable to update your password."
        ),
      }));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {errors.form ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {errors.form}
        </div>
      ) : null}

      {successMessage ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {successMessage}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <DashboardPanel title="Change Password" bodyClassName="space-y-6">
          <form className="space-y-5" onSubmit={handleSubmit}>
            <AuthInput
              label="Current Password"
              name="currentPassword"
              type={showCurrentPassword ? "text" : "password"}
              value={form.currentPassword}
              onChange={handleChange}
              placeholder="Enter your current password"
              error={errors.currentPassword}
              required
              autoComplete="current-password"
              rightElement={
                <ToggleButton
                  active={showCurrentPassword}
                  onClick={() => setShowCurrentPassword((value) => !value)}
                  label="Toggle current password visibility"
                />
              }
            />

            <AuthInput
              label="New Password"
              name="newPassword"
              type={showNewPassword ? "text" : "password"}
              value={form.newPassword}
              onChange={handleChange}
              placeholder="Enter a new password"
              error={errors.newPassword}
              required
              autoComplete="new-password"
              rightElement={
                <ToggleButton
                  active={showNewPassword}
                  onClick={() => setShowNewPassword((value) => !value)}
                  label="Toggle new password visibility"
                />
              }
            />

            <PasswordRules rules={passwordState.rules} />

            <AuthInput
              label="Confirm New Password"
              name="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              value={form.confirmPassword}
              onChange={handleChange}
              placeholder="Confirm the new password"
              error={errors.confirmPassword}
              required
              autoComplete="new-password"
              rightElement={
                <ToggleButton
                  active={showConfirmPassword}
                  onClick={() => setShowConfirmPassword((value) => !value)}
                  label="Toggle confirm password visibility"
                />
              }
            />

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:from-blue-500 hover:to-indigo-500 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting ? "Updating..." : "Update Password"}
              </button>
              <div className="inline-flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
                <ShieldAlert size={14} />
                Keep this only for the super admin account.
              </div>
            </div>
          </form>
        </DashboardPanel>

        <div className="space-y-6">
          <DashboardPanel title="Password Guide" bodyClassName="space-y-4">
            <div className="flex items-start gap-3 rounded-2xl bg-slate-50 px-4 py-3">
              <CheckCircle2 className="mt-0.5 text-emerald-500" size={18} />
              <p className="text-sm text-slate-600">
                Use a strong password with uppercase, lowercase, number, and a
                special character.
              </p>
            </div>
            <div className="flex items-start gap-3 rounded-2xl bg-slate-50 px-4 py-3">
              <Eye className="mt-0.5 text-blue-500" size={18} />
              <p className="text-sm text-slate-600">
                The current session stays active after a password change. Use
                the new password the next time you sign in.
              </p>
            </div>
            <div className="flex items-start gap-3 rounded-2xl bg-slate-50 px-4 py-3">
              <EyeOff className="mt-0.5 text-violet-500" size={18} />
              <p className="text-sm text-slate-600">
                If you forget it later, use the reset password flow from the
                login screen.
              </p>
            </div>
          </DashboardPanel>
        </div>
      </div>
    </div>
  );
}
