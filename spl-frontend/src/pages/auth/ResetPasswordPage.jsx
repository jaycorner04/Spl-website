import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { resetPassword } from "../../api/authAPI";
import AuthLeftPanel from "../../components/auth/AuthLeftPanel";
import AuthInput from "../../components/auth/AuthInput";
import PasswordRules from "../../components/auth/PasswordRules";
import { getApiErrorMessage } from "../../utils/apiErrors";
import { validatePassword } from "../../utils/authValidators";

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [form, setForm] = useState({
    token: searchParams.get("token") || "",
    password: "",
    confirmPassword: "",
  });

  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const passwordState = useMemo(
    () => validatePassword(form.password || ""),
    [form.password]
  );

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));

    setErrors((prev) => ({
      ...prev,
      [name]: "",
      form: "",
    }));
  };

  const validateForm = () => {
    const nextErrors = {};

    if (!form.token.trim()) {
      nextErrors.token = "Please enter reset token";
    }

    if (!form.password.trim()) {
      nextErrors.password = "Please enter new password";
    } else if (!passwordState.isValid) {
      nextErrors.password = "Password does not meet the required format";
    }

    if (!form.confirmPassword.trim()) {
      nextErrors.confirmPassword = "Please confirm password";
    } else if (form.password !== form.confirmPassword) {
      nextErrors.confirmPassword = "Password and confirm password must match";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await resetPassword({
        token: form.token.trim(),
        password: form.password,
      });

      navigate("/login", {
        replace: true,
        state: {
          message:
            response?.message ||
            "Password updated successfully. Please sign in.",
        },
      });
    } catch (error) {
      setErrors((prev) => ({
        ...prev,
        form: getApiErrorMessage(error, "Unable to reset your password."),
      }));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full overflow-hidden bg-slate-100">
      <div className="grid min-h-screen w-full lg:grid-cols-[0.95fr_1.05fr]">
        <AuthLeftPanel
          titleTop="RESET"
          titleMiddle="YOUR"
          titleBottom="PASSWORD"
          subtitle="Create a strong new password and get back into the SPL platform."
        />

        <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,#f8fafc_0%,#eef4ff_100%)] px-4 py-4 sm:px-6 lg:px-8">
          <div className="w-full max-w-xl rounded-[28px] border border-white/70 bg-white/90 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.10)] backdrop-blur sm:p-7">
            <div className="mb-4 lg:hidden">
              <Link
                to="/"
                className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-blue-600"
              >
                <span>←</span>
                <span>Back to Home Page</span>
              </Link>
            </div>

            <h1 className="font-heading text-4xl tracking-[0.08em] text-slate-900 sm:text-5xl">
              RESET PASSWORD
            </h1>

            <p className="mt-2 text-sm text-slate-500 sm:text-base">
              Enter your new password below
            </p>

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              {errors.form ? (
                <div className="rounded-[18px] border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
                  {errors.form}
                </div>
              ) : null}

              <AuthInput
                label="Reset Token"
                name="token"
                value={form.token}
                onChange={handleChange}
                placeholder="Enter the reset token"
                error={errors.token}
                required
              />

              <div>
                <AuthInput
                  label="New Password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Enter new password"
                  error={errors.password}
                  required
                  autoComplete="new-password"
                  rightElement={
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="text-xs font-medium text-slate-500 transition hover:text-blue-600"
                    >
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  }
                />

                <PasswordRules rules={passwordState.rules} />
              </div>

              <AuthInput
                label="Confirm Password"
                name="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                value={form.confirmPassword}
                onChange={handleChange}
                placeholder="Confirm new password"
                error={errors.confirmPassword}
                required
                autoComplete="new-password"
                rightElement={
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    className="text-xs font-medium text-slate-500 transition hover:text-blue-600"
                  >
                    {showConfirmPassword ? "Hide" : "Show"}
                  </button>
                }
              />

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-[16px] bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-3 font-condensed text-base uppercase tracking-[0.14em] text-white shadow-[0_12px_30px_rgba(37,99,235,0.24)] transition hover:translate-y-[-1px] hover:from-blue-700 hover:to-indigo-700"
              >
                {isSubmitting ? "Updating..." : "Update Password"}
              </button>

              <p className="text-center text-sm text-slate-600">
                Back to{" "}
                <Link
                  to="/login"
                  className="font-semibold text-blue-600 hover:text-blue-700"
                >
                  Sign In
                </Link>
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
