export default function PasswordRules({ rules }) {
  const items = [
    { label: "At least 8 characters", valid: rules.minLength },
    { label: "One uppercase letter", valid: rules.uppercase },
    { label: "One lowercase letter", valid: rules.lowercase },
    { label: "One number", valid: rules.number },
    { label: "One special character", valid: rules.specialChar },
  ];

  return (
    <div className="mt-2 rounded-[14px] border border-slate-200 bg-slate-50 p-3">
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-slate-600">
        Password Requirements
      </p>

      <div className="grid gap-1 sm:grid-cols-2">
        {items.map((item) => (
          <div
            key={item.label}
            className={`text-xs ${
              item.valid ? "text-green-600" : "text-slate-500"
            }`}
          >
            {item.valid ? "✓" : "•"} {item.label}
          </div>
        ))}
      </div>
    </div>
  );
}