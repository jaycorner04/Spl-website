import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { registerUser } from "../../api/authAPI";
import AuthLeftPanel from "../../components/auth/AuthLeftPanel";
import AuthInput from "../../components/auth/AuthInput";
import PasswordRules from "../../components/auth/PasswordRules";
import RoleSelector from "../../components/auth/RoleSelector";
import { registerRoleOptions } from "../../components/auth/roleOptions";
import { getApiErrorMessage } from "../../utils/apiErrors";
import {
  getDefaultPostLoginPath,
  saveAuthSession,
} from "../../utils/authStorage";
import {
  validateEmail,
  validateAllowedRegistrationEmail,
  validatePassword,
} from "../../utils/authValidators";

export default function RegisterPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestedRole = searchParams.get("role");
  const initialRole = registerRoleOptions.some(
    (role) => role.value === requestedRole
  )
    ? requestedRole
    : "fan_user";

  const [selectedRole, setSelectedRole] = useState(initialRole);
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    employeeId: "",
    password: "",
    confirmPassword: "",
    franchiseName: "",
    website: "",
    address: "",
  });

  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const formErrorRef = useRef(null);
  const selectedRoleMeta = registerRoleOptions.find(
    (role) => role.value === selectedRole
  );
  const isFranchiseRegistration = selectedRole === "franchise_admin";

  const passwordState = useMemo(
    () => validatePassword(form.password || ""),
    [form.password]
  );

  useEffect(() => {
    if (!errors.form || !formErrorRef.current) {
      return;
    }

    formErrorRef.current.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
    formErrorRef.current.focus({ preventScroll: true });
  }, [errors.form]);

  const buildRegisterErrorState = (message) => {
    const normalizedMessage = String(message || "").toLowerCase();
    const nextErrors = {
      form: message,
    };

    if (normalizedMessage.includes("email")) {
      nextErrors.email = message;
    }

    if (normalizedMessage.includes("employee id")) {
      nextErrors.employeeId = message;
    }

    if (isFranchiseRegistration && normalizedMessage.includes("franchise")) {
      nextErrors.franchiseName = message;
    }

    return nextErrors;
  };

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
      franchiseName: "",
    }));
  };

  const validateForm = () => {
    const nextErrors = {};

    if (!form.fullName.trim()) {
      nextErrors.fullName = "Please enter full name";
    }

    if (!form.email.trim()) {
      nextErrors.email = "Please enter email";
    } else if (!validateEmail(form.email.trim())) {
      nextErrors.email = "Please enter a valid email address";
    } else if (!validateAllowedRegistrationEmail(form.email.trim())) {
      nextErrors.email = "Add valid Gmail account.";
    }

    if (!form.employeeId.trim()) {
      nextErrors.employeeId = "Please enter employee ID";
    }

    if (isFranchiseRegistration && !form.franchiseName.trim()) {
      nextErrors.franchiseName = "Please enter franchise name";
    }

    if (!form.password.trim()) {
      nextErrors.password = "Please enter password";
    } else if (!passwordState.isValid) {
      nextErrors.password = "Password does not meet the required format";
    }

    if (!form.confirmPassword.trim()) {
      nextErrors.confirmPassword = "Please confirm password";
    } else if (form.password !== form.confirmPassword) {
      nextErrors.confirmPassword = "Password and confirm password must match";
    }

    const firstValidationError =
      nextErrors.franchiseName ||
      nextErrors.fullName ||
      nextErrors.email ||
      nextErrors.employeeId ||
      nextErrors.password ||
      nextErrors.confirmPassword;

    if (firstValidationError) {
      nextErrors.form = firstValidationError;
    }

    setErrors(nextErrors);
    return !firstValidationError;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const authResponse = await registerUser({
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        employeeId: form.employeeId.trim(),
        password: form.password,
        role: selectedRole,
        franchiseName: form.franchiseName.trim(),
        website: form.website.trim(),
        address: form.address.trim(),
      });

      saveAuthSession(authResponse);
      navigate(getDefaultPostLoginPath(authResponse.user.role), {
        replace: true,
        state: authResponse.message
          ? {
              message: authResponse.message,
            }
          : undefined,
      });
    } catch (error) {
      const errorMessage = getApiErrorMessage(
        error,
        "Unable to create your account."
      );
      setErrors(buildRegisterErrorState(errorMessage));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full overflow-hidden bg-slate-100">
      <div className="grid min-h-screen w-full lg:grid-cols-[0.95fr_1.05fr]">
        <AuthLeftPanel
          titleTop="JOIN"
          titleMiddle="SPL"
          titleBottom="LEAGUE"
          subtitle="Create your account and become part of the Software Premier League weekend cricket experience."
        />

        <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,#f8fafc_0%,#eef4ff_100%)] px-4 py-4 sm:px-6 lg:px-8">
          <div className="w-full max-w-3xl rounded-[28px] border border-white/70 bg-white/90 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.10)] backdrop-blur sm:p-7">
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
              REGISTER
            </h1>

            <p className="mt-2 text-sm text-slate-500 sm:text-base">
              Create your SPL account to continue
            </p>

            <div className="mt-5">
              <label className="mb-2 block font-condensed text-sm uppercase tracking-[0.12em] text-slate-600">
                Register As
              </label>

              <RoleSelector
                selectedRole={selectedRole}
                onChange={handleRoleChange}
                options={registerRoleOptions}
              />
            </div>

            <div
              className={`mt-4 rounded-[18px] px-4 py-3 text-sm font-medium ${
                isFranchiseRegistration
                  ? "border border-purple-200 bg-purple-50 text-purple-700"
                  : "border border-amber-200 bg-amber-50 text-amber-700"
              }`}
            >
              {isFranchiseRegistration ? (
                <>
                  You are registering as{" "}
                  <span className="font-semibold">
                    {selectedRoleMeta?.title || "Franchise Admin"}
                  </span>
                  . Your franchise appears in the super admin franchise list
                  right away. You can sign in and manage your franchise, teams,
                  and players immediately, but it stays hidden from the public
                  home page until super admin approval.
                </>
              ) : (
                <>
                  Public registration creates a{" "}
                  <span className="font-semibold">Fan User</span> account.
                </>
              )}
            </div>

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              {errors.form ? (
                <div
                  ref={formErrorRef}
                  tabIndex={-1}
                  role="alert"
                  aria-live="assertive"
                  className="rounded-[18px] border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600 outline-none"
                >
                  {errors.form}
                </div>
              ) : null}

              <div className="grid gap-4 sm:grid-cols-2">
                {isFranchiseRegistration ? (
                  <AuthInput
                    label="Franchise Name"
                    name="franchiseName"
                    value={form.franchiseName}
                    onChange={handleChange}
                    placeholder="Enter franchise name"
                    error={errors.franchiseName}
                    required
                  />
                ) : null}

                <AuthInput
                  label="Full Name"
                  name="fullName"
                  value={form.fullName}
                  onChange={handleChange}
                  placeholder="Enter your full name"
                  error={errors.fullName}
                  required
                  autoComplete="name"
                />

                <AuthInput
                  label="Email"
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="Enter your email"
                  error={errors.email}
                  required
                  autoComplete="email"
                />

                <AuthInput
                  label="Employee ID"
                  name="employeeId"
                  value={form.employeeId}
                  onChange={handleChange}
                  placeholder="Enter employee ID"
                  error={errors.employeeId}
                  required
                />

                {isFranchiseRegistration ? (
                  <>
                    <AuthInput
                      label="Website"
                      name="website"
                      value={form.website}
                      onChange={handleChange}
                      placeholder="https://yourfranchise.com"
                      error={errors.website}
                    />

                    <div className="sm:col-span-2">
                      <label className="mb-1.5 block font-condensed text-sm uppercase tracking-[0.12em] text-slate-600">
                        Address
                      </label>
                      <textarea
                        name="address"
                        value={form.address}
                        onChange={handleChange}
                        rows={3}
                        placeholder="Enter franchise address"
                        className="w-full rounded-[16px] border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                      />
                    </div>
                  </>
                ) : null}

                <div className="sm:col-span-2">
                  <AuthInput
                    label="Password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={handleChange}
                    placeholder="Create password"
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

                <div className="sm:col-span-2">
                  <AuthInput
                    label="Confirm Password"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={form.confirmPassword}
                    onChange={handleChange}
                    placeholder="Confirm password"
                    error={errors.confirmPassword}
                    required
                    autoComplete="new-password"
                    rightElement={
                      <button
                        type="button"
                        onClick={() =>
                          setShowConfirmPassword((prev) => !prev)
                        }
                        className="text-xs font-medium text-slate-500 transition hover:text-blue-600"
                      >
                        {showConfirmPassword ? "Hide" : "Show"}
                      </button>
                    }
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-[16px] bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-3 font-condensed text-base uppercase tracking-[0.14em] text-white shadow-[0_12px_30px_rgba(37,99,235,0.24)] transition hover:translate-y-[-1px] hover:from-blue-700 hover:to-indigo-700"
              >
                {isSubmitting
                  ? isFranchiseRegistration
                    ? "Creating Franchise Account..."
                    : "Creating Account..."
                  : isFranchiseRegistration
                  ? "Create Franchise Account"
                  : "Create Account"}
              </button>

              <p className="text-center text-sm text-slate-600">
                Already have an account?{" "}
                <Link
                  to={selectedRole ? `/login?role=${selectedRole}` : "/login"}
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
