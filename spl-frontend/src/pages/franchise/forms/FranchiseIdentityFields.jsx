export default function FranchiseIdentityFields({
  modalType,
  logoInputRef,
  onLogoFileChange,
  logoPreviewUrl,
  form,
  franchiseInitials,
  logoUploadError,
  onOpenLogoPicker,
  uploadingLogo,
  onClearLogo,
  selectedFranchise,
  formatFranchiseId,
  getInputClass,
  onInputChange,
}) {
  return (
    <>
      <input
        ref={logoInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={onLogoFileChange}
      />

      {modalType !== "add-team" && (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              {logoPreviewUrl ? (
                <img
                  src={logoPreviewUrl}
                  alt={form.company_name || "Franchise logo preview"}
                  className="h-20 w-20 rounded-2xl border border-slate-200 bg-white object-contain p-2 shadow-sm"
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white font-heading text-2xl tracking-[0.08em] text-slate-500">
                  {franchiseInitials}
                </div>
              )}

              <div>
                <p className="font-condensed text-sm uppercase tracking-[0.16em] text-slate-700">
                  Franchise Logo
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Upload a JPG, PNG, or WEBP image up to 5 MB.
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  This logo can be used on the home franchise section when a team logo is not available.
                </p>
                {modalType === "add" ? (
                  <p className="mt-1 text-sm text-slate-500">
                    For a new franchise, finish by clicking Add Franchise so the logo stays attached to the saved record.
                  </p>
                ) : null}
                {logoUploadError ? (
                  <p className="mt-2 text-sm text-red-600">{logoUploadError}</p>
                ) : null}
              </div>
            </div>

            {modalType !== "view" ? (
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={onOpenLogoPicker}
                  disabled={uploadingLogo}
                  className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {uploadingLogo
                    ? "Uploading..."
                    : form.logo
                    ? "Change Logo"
                    : "Upload Logo"}
                </button>

                {form.logo ? (
                  <button
                    type="button"
                    onClick={onClearLogo}
                    disabled={uploadingLogo}
                    className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-600 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    Remove
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      )}

      {modalType !== "add-team" ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm text-slate-500">
              Franchise ID
            </label>
            <input
              value={
                selectedFranchise
                  ? formatFranchiseId(selectedFranchise.id)
                  : "Auto-generated"
              }
              readOnly
              className={getInputClass(true)}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-slate-500">
              Franchise Name <span className="text-red-500">*</span>
            </label>
            <input
              name="company_name"
              value={form.company_name}
              onChange={onInputChange}
              readOnly={modalType === "view"}
              className={getInputClass(modalType === "view")}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-slate-500">
              Owner Name
            </label>
            <input
              name="owner_name"
              value={form.owner_name}
              onChange={onInputChange}
              readOnly={modalType === "view"}
              className={getInputClass(modalType === "view")}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-slate-500">
              Website
            </label>
            <input
              name="website"
              value={form.website}
              onChange={onInputChange}
              readOnly={modalType === "view"}
              className={getInputClass(modalType === "view")}
            />
          </div>

          <div className="sm:col-span-2">
            <label className="mb-2 block text-sm text-slate-500">
              Address
            </label>
            <textarea
              name="address"
              value={form.address}
              onChange={onInputChange}
              readOnly={modalType === "view"}
              rows={3}
              className={`${getInputClass(modalType === "view")} resize-none`}
            />
          </div>
        </div>
      ) : null}
    </>
  );
}
