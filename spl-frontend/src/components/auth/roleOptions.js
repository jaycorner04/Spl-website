export const roleOptions = [
  {
    value: "super_admin",
    icon: "SA",
    title: "Super Admin",
    subtitle: "Full league control",
  },
  {
    value: "ops_manager",
    icon: "OP",
    title: "Ops Manager",
    subtitle: "Match operations",
  },
  {
    value: "franchise_admin",
    icon: "FR",
    title: "Franchise Admin",
    subtitle: "Team management",
  },
  {
    value: "scorer",
    icon: "SC",
    title: "Scorer",
    subtitle: "Live scoring",
  },
  {
    value: "finance_admin",
    icon: "FI",
    title: "Finance Admin",
    subtitle: "Financial ops",
  },
  {
    value: "fan_user",
    icon: "FN",
    title: "Fan User",
    subtitle: "Fan experience",
  },
];

export const registerRoleOptions = roleOptions.filter((role) =>
  ["fan_user", "franchise_admin"].includes(role.value)
);

export const loginRoleOptions = roleOptions;
