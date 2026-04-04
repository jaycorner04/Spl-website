import { useState } from "react";
import { Link } from "react-router-dom";
import { requestPasswordReset } from "../../api/authAPI";
import AuthLeftPanel from "../../components/auth/AuthLeftPanel";
import AuthInput from "../../components/auth/AuthInput";
import { getApiErrorMessage } from "../../utils/apiErrors";
import { validateEmail } from "../../utils/authValidators";

export default function ForgotPasswordPage() {
  const [form, setForm] = useState({
    email: "",
  });

  const [errors, setErrors] = useState({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resetState, setResetState] = useState(null);

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

    if (!form.email.trim()) {
      nextErrors.email = "Please enter email";
    } else if (!validateEmail(form.email.trim())) {
      nextErrors.email = "Please enter a valid email address";
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
      const response = await requestPasswordReset({
        email: form.email.trim(),
      });

      setResetState(response);
      setIsSubmitted(true);
    } catch (error) {
      setErrors((prev) => ({
        ...prev,
        form: getApiErrorMessage(
          error,
          "Unable to start the password reset process."
        ),
      }));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full overflow-hidden bg-slate-100">
      <div className="grid min-h-screen w-full lg:grid-cols-[0.95fr_1.05fr]">
        <AuthLeftPanel
          titleTop="FORGOT"
          titleMiddle="YOUR"
          titleBottom="PASSWORD"
          subtitle="Enter your registered email address and we will help you reset your password."
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
              FORGOT PASSWORD
            </h1>

            <p className="mt-2 text-sm text-slate-500 sm:text-base">
              Enter your email to receive reset instructions
            </p>

            {isSubmitted ? (
              <div className="mt-6 rounded-[18px] border border-green-200 bg-green-50 p-4">
                <p className="text-sm font-medium text-green-700">
                  {resetState?.message ||
                    "Reset instructions have been generated successfully."}
                </p>

                {resetState?.resetToken ? (
                  <div className="mt-4 rounded-[14px] border border-slate-200 bg-white px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Dev Reset Token
                    </p>
                    <p className="mt-2 break-all font-mono text-sm text-slate-700">
                      {resetState.resetToken}
                    </p>
                    <Link
                      to={`/reset-password?token=${encodeURIComponent(
                        resetState.resetToken
                      )}`}
                      className="mt-3 inline-flex text-sm font-semibold text-blue-600 hover:text-blue-700"
                    >
                      Open Reset Password
                    </Link>
                  </div>
                ) : null}

                <div className="mt-4">
                  <Link
                    to="/login"
                    className="font-semibold text-blue-600 hover:text-blue-700"
                  >
                    Back to Sign In
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="mt-5 space-y-4">
                {errors.form ? (
                  <div className="rounded-[18px] border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
                    {errors.form}
                  </div>
                ) : null}

                <AuthInput
                  label="Email"
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="Enter your registered email"
                  error={errors.email}
                  required
                  autoComplete="email"
                />

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full rounded-[16px] bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-3 font-condensed text-base uppercase tracking-[0.14em] text-white shadow-[0_12px_30px_rgba(37,99,235,0.24)] transition hover:translate-y-[-1px] hover:from-blue-700 hover:to-indigo-700"
                >
                  {isSubmitting ? "Sending..." : "Send Reset Link"}
                </button>

                <p className="text-center text-sm text-slate-600">
                  Remembered your password?{" "}
                  <Link
                    to="/login"
                    className="font-semibold text-blue-600 hover:text-blue-700"
                  >
                    Sign In
                  </Link>
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
