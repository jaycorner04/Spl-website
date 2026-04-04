import RoleCard from "./RoleCard";

export const roleOptions = [
  {
    value: "super_admin",
    icon: "👑",
    title: "Super Admin",
    subtitle: "Full league control",
  },
  {
    value: "ops_manager",
    icon: "⚙️",
    title: "Ops Manager",
    subtitle: "Match operations",
  },
  {
    value: "franchise_admin",
    icon: "🎮",
    title: "Franchise Admin",
    subtitle: "Team management",
  },
  {
    value: "scorer",
    icon: "📊",
    title: "Scorer",
    subtitle: "Live scoring",
  },
  {
    value: "finance_admin",
    icon: "💼",
    title: "Finance Admin",
    subtitle: "Financial ops",
  },
  {
    value: "fan_user",
    icon: "🎉",
    title: "Fan User",
    subtitle: "Fan experience",
  },
];

export default function RoleSelector({
  selectedRole,
  onChange,
  collapsed = false,
  onReset,
  options = roleOptions,
}) {
  const visibleRoles =
    collapsed && selectedRole
      ? options.filter((role) => role.value === selectedRole)
      : options;

  return (
    <div className="space-y-3">
      <div
        className={
          collapsed
            ? "grid grid-cols-1"
            : "grid grid-cols-2 gap-3 md:grid-cols-3"
        }
      >
        {visibleRoles.map((role) => (
          <RoleCard
            key={role.value}
            icon={role.icon}
            title={role.title}
            subtitle={role.subtitle}
            active={selectedRole === role.value}
            onClick={() => onChange(role.value)}
          />
        ))}
      </div>

      {collapsed && typeof onReset === "function" ? (
        <button
          type="button"
          onClick={onReset}
          className="text-sm font-medium text-blue-600 transition hover:text-blue-700"
        >
          Change Role
        </button>
      ) : null}
    </div>
  );
}
