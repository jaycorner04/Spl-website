import FranchiseRegistrySection from "../../sections/FranchiseRegistrySection";

export default function TeamRegistrationSection({
  isFranchiseAdmin,
  filteredFranchises,
  scopedFranchiseId,
  loading,
  columns,
  onAdd,
  onExport,
  onEditOwnFranchise,
}) {
  return (
    <div className="space-y-6">
      <FranchiseRegistrySection
        isFranchiseAdmin={isFranchiseAdmin}
        filteredFranchises={filteredFranchises}
        scopedFranchiseId={scopedFranchiseId}
        loading={loading}
        columns={columns}
        onAdd={onAdd}
        onExport={onExport}
        onEditOwnFranchise={onEditOwnFranchise}
      />
    </div>
  );
}
