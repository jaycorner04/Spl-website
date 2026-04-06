import RoleCard from "./RoleCard";
import { roleOptions } from "./roleOptions";

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