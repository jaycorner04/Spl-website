import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import AuthLeftPanel from "../../components/auth/AuthLeftPanel";
import RoleSelector from "../../components/auth/RoleSelector";
import { loginRoleOptions } from "../../components/auth/roleOptions";
import AuthInput from "../../components/auth/AuthInput";
import { loginUser } from "../../api/authAPI";
import { getApiErrorMessage } from "../../utils/apiErrors";
import {
  getDefaultPostLoginPath,
  isAuthorizedForPath,
  saveAuthSession,
} from "../../utils/authStorage";
import { validateEmail } from "../../utils/authValidators";

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryRole = new URLSearchParams(location.search).get("role") || "";

  const [selectedRole, setSelectedRole] = useState(
    location.state?.preselectedRole || queryRole
  );
  const [form, setForm] = useState({
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const statusMessage = location.state?.message || "";
  const selectedRoleMeta = loginRoleOptions.find(
    (role) => role.value === selectedRole
  );
  const isPublicRegistrationRole = ["fan_user", "franchise_admin"].includes(
    selectedRole
  );

  const handleChange = (event) => {
    const { name, value } = event.target;

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

  const handleRoleChange = (roleValue) => {
    setSelectedRole(roleValue);
    setErrors((prev) => ({
      ...prev,
      form: "",
    }));
  };

  const handleRoleReset = () => {
    setSelectedRole("");
    setErrors((prev) => ({
      ...prev,
      form: "",
    }));
  };

  const validateForm = () => {
    const nextErrors = {};

    if (!form.email.trim()) {
      nextErrors.email = "Please enter username or email";
    } else if (!validateEmail(form.email.trim())) {
      nextErrors.email = "Please enter a valid email address";
    }

    if (!form.password.trim()) {
      nextErrors.password = "Please enter password";
    }

    if (!selectedRole) {
      nextErrors.form = "Please select a role";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const authResponse = await loginUser({
        email: form.email.trim(),
        password: form.password,
        role: selectedRole,
      });

      saveAuthSession(authResponse);

      const requestedPath = location.state?.from;
      const nextPath =
        typeof requestedPath === "string" &&
        isAuthorizedForPath(requestedPath, authResponse.user)
          ? requestedPath
          : getDefaultPostLoginPath(authResponse.user.role);

      navigate(nextPath, { replace: true });
    } catch (error) {
      setErrors((prev) => ({
        ...prev,
        form: getApiErrorMessage(error, "Unable to sign in right now."),
      }));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full overflow-hidden bg-slate-100">
      <div className="grid min-h-screen w-full lg:grid-cols-[0.95fr_1.05fr]">
        <AuthLeftPanel />

        <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,#f8fafc_0%,#eef4ff_100%)] px-4 py-4 sm:px-6 lg:px-8">
          <div className="w-full max-w-2xl rounded-[28px] border border-white/70 bg-white/90 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.10)] backdrop-blur sm:p-7">
            <div className="mb-4 lg:hidden">
              <Link
                to="/"
                className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-blue-600"
              >
                <span>{"<-"}</span>
                <span>Back to Home Page</span>
              </Link>
            </div>

            <h1 className="font-heading text-4xl tracking-[0.08em] text-slate-900 sm:text-5xl">
              SIGN IN
            </h1>

            <p className="mt-2 text-sm text-slate-500 sm:text-base">
              Select your role and sign in to continue
            </p>

            {statusMessage ? (
              <div className="mt-4 rounded-[18px] border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
                {statusMessage}
              </div>
            ) : null}

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <div>
                <label className="mb-2 block font-condensed text-sm uppercase tracking-[0.12em] text-slate-600">
                  Select Role <span className="text-red-500">*</span>
                </label>

                <RoleSelector
                  selectedRole={selectedRole}
                  onChange={handleRoleChange}
                  collapsed={Boolean(selectedRole)}
                  onReset={handleRoleReset}
                  options={loginRoleOptions}
                />
              </div>

              {selectedRoleMeta ? (
                <div className="rounded-[18px] border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
                  Signing in as <span className="font-semibold">{selectedRoleMeta.title}</span>. Enter the username/email and password for this role.
                </div>
              ) : null}

              {errors.form ? (
                <div className="rounded-[18px] border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
                  {errors.form}
                </div>
              ) : null}

              <AuthInput
                label="Username / Email"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                placeholder="Enter your username or email"
                error={errors.email}
                required
                autoComplete="email"
              />

              <div>
                <AuthInput
                  label="Password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                  error={errors.password}
                  required
                  autoComplete="current-password"
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
              </div>

              <div className="flex flex-col gap-2 text-xs sm:flex-row sm:justify-between">
                <Link
                  to="/forgot-password"
                  className="font-medium text-blue-600 transition hover:text-blue-700"
                >
                  Forgot Password?
                </Link>

                <Link
                  to="/reset-password"
                  className="font-medium text-blue-600 transition hover:text-blue-700"
                >
                  Reset Password
                </Link>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-[16px] bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-3 font-condensed text-base uppercase tracking-[0.14em] text-white shadow-[0_12px_30px_rgba(37,99,235,0.24)] transition hover:translate-y-[-1px] hover:from-blue-700 hover:to-indigo-700"
              >
                {isSubmitting ? "Signing In..." : "Sign In"}
              </button>

              {isPublicRegistrationRole ? (
                <p className="text-center text-sm text-slate-600">
                  Don&apos;t have an account?{" "}
                  <Link
                    to={
                      selectedRole ? `/register?role=${selectedRole}` : "/register"
                    }
                    className="font-semibold text-blue-600 hover:text-blue-700"
                  >
                    Register
                  </Link>
                </p>
              ) : selectedRole ? (
                <p className="text-center text-sm text-slate-600">
                  Accounts for this role are created internally and cannot be registered publicly.
                </p>
              ) : (
                <p className="text-center text-sm text-slate-600">
                  Choose a role to continue.
                </p>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
