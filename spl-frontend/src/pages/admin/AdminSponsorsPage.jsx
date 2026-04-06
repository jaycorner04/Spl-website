import { useEffect, useMemo, useRef, useState } from "react";
import DashboardPanel from "../../components/dashboard/DashboardPanel";
import ManagementModal from "../../components/dashboard/ManagementModal";
import { getSponsors, updateSponsors, uploadSponsorLogo } from "../../api/homeAPI";
import { getApiErrorMessage } from "../../utils/apiErrors";
import { getMediaUrl } from "../../utils/media";
import raynxSystemsTitleSponsor from "../../assets/sponsors/raynx-systems-title-sponsor.jpg";

const defaultSponsorsState = {
  titleSponsor: {
    label: "Title Sponsor",
    name: "Raynx Systems Private Limited",
    imageFile: "raynx-systems-title-sponsor.jpg",
  },
  premierPartners: [],
  supportPartners: [],
};

const defaultTitleForm = {
  label: "",
  name: "",
  imageFile: "",
};

const defaultPremierForm = {
  name: "",
};

const defaultSupportForm = {
  role: "",
  brand: "",
  color: "#334155",
  subline: "",
};

function getInputClass() {
  return "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-purple-400 focus:ring-4 focus:ring-purple-500/10";
}

function resolveSponsorImage(imageFile = "") {
  if (!imageFile) {
    return raynxSystemsTitleSponsor;
  }

  if (imageFile === "raynx-systems-title-sponsor.jpg") {
    return raynxSystemsTitleSponsor;
  }

  return getMediaUrl(imageFile);
}

export default function AdminSponsorsPage() {
  const [sponsors, setSponsors] = useState(defaultSponsorsState);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [modalType, setModalType] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [formError, setFormError] = useState("");
  const [titleForm, setTitleForm] = useState(defaultTitleForm);
  const [premierForm, setPremierForm] = useState(defaultPremierForm);
  const [supportForm, setSupportForm] = useState(defaultSupportForm);
  const titleLogoInputRef = useRef(null);

  const normalizedSponsors = useMemo(
    () => ({
      titleSponsor:
        sponsors && Object.prototype.hasOwnProperty.call(sponsors, "titleSponsor")
          ? sponsors.titleSponsor
          : defaultSponsorsState.titleSponsor,
      premierPartners: Array.isArray(sponsors?.premierPartners)
        ? sponsors.premierPartners
        : [],
      supportPartners: Array.isArray(sponsors?.supportPartners)
        ? sponsors.supportPartners
        : [],
    }),
    [sponsors]
  );

  const titleSponsorPreview = resolveSponsorImage(titleForm.imageFile);

  useEffect(() => {
    let active = true;

    async function loadSponsorsData() {
      try {
        setLoading(true);
        setError("");
        const response = await getSponsors();

        if (!active) {
          return;
        }

        setSponsors({
          titleSponsor:
            response && Object.prototype.hasOwnProperty.call(response, "titleSponsor")
              ? response.titleSponsor
              : defaultSponsorsState.titleSponsor,
          premierPartners: Array.isArray(response?.premierPartners)
            ? response.premierPartners
            : [],
          supportPartners: Array.isArray(response?.supportPartners)
            ? response.supportPartners
            : [],
        });
      } catch (requestError) {
        if (!active) {
          return;
        }

        setError(
          getApiErrorMessage(requestError, "Unable to load sponsor content.")
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadSponsorsData();

    return () => {
      active = false;
    };
  }, []);

  const closeModal = () => {
    setModalType("");
    setSelectedIndex(null);
    setFormError("");
    setTitleForm(defaultTitleForm);
    setPremierForm(defaultPremierForm);
    setSupportForm(defaultSupportForm);
    setUploading(false);
  };

  const persistSponsors = async (nextSponsors) => {
    try {
      setSaving(true);
      setFormError("");
      const savedSponsors = await updateSponsors(nextSponsors);
      setSponsors({
        titleSponsor:
          savedSponsors && Object.prototype.hasOwnProperty.call(savedSponsors, "titleSponsor")
            ? savedSponsors.titleSponsor
            : null,
        premierPartners: Array.isArray(savedSponsors?.premierPartners)
          ? savedSponsors.premierPartners
          : [],
        supportPartners: Array.isArray(savedSponsors?.supportPartners)
          ? savedSponsors.supportPartners
          : [],
      });
      closeModal();
    } catch (requestError) {
      setFormError(
        getApiErrorMessage(requestError, "Unable to update sponsors.")
      );
    } finally {
      setSaving(false);
    }
  };

  const openTitleModal = () => {
    setModalType("title");
    setSelectedIndex(null);
    setFormError("");
    setTitleForm({
      label: normalizedSponsors.titleSponsor?.label || "Title Sponsor",
      name: normalizedSponsors.titleSponsor?.name || "",
      imageFile: normalizedSponsors.titleSponsor?.imageFile || "",
    });
  };

  const openPremierModal = (index = null) => {
    const currentPartner =
      index == null ? null : normalizedSponsors.premierPartners[index];

    setModalType("premier");
    setSelectedIndex(index);
    setFormError("");
    setPremierForm({
      name: currentPartner?.name || "",
    });
  };

  const openSupportModal = (index = null) => {
    const currentPartner =
      index == null ? null : normalizedSponsors.supportPartners[index];

    setModalType("support");
    setSelectedIndex(index);
    setFormError("");
    setSupportForm({
      role: currentPartner?.role || "",
      brand: currentPartner?.brand || "",
      color: currentPartner?.color || "#334155",
      subline: currentPartner?.subline || "",
    });
  };

  const handleTitleInputChange = (event) => {
    const { name, value } = event.target;
    setTitleForm((prev) => ({
      ...prev,
      [name]: value,
    }));
    setFormError("");
  };

  const handlePremierInputChange = (event) => {
    const { name, value } = event.target;
    setPremierForm((prev) => ({
      ...prev,
      [name]: value,
    }));
    setFormError("");
  };

  const handleSupportInputChange = (event) => {
    const { name, value } = event.target;
    setSupportForm((prev) => ({
      ...prev,
      [name]: value,
    }));
    setFormError("");
  };

  const handleTitleLogoSelect = () => {
    titleLogoInputRef.current?.click();
  };

  const handleTitleLogoChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setFormError("Please choose a valid image file.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setFormError("Image must be 5 MB or smaller.");
      return;
    }

    try {
      setUploading(true);
      setFormError("");
      const uploadResponse = await uploadSponsorLogo(file);
      setTitleForm((prev) => ({
        ...prev,
        imageFile: uploadResponse.path || "",
      }));
    } catch (uploadError) {
      setFormError(
        getApiErrorMessage(uploadError, "Unable to upload sponsor logo.")
      );
    } finally {
      setUploading(false);
    }
  };

  const handleSaveTitleSponsor = async () => {
    if (!titleForm.label.trim() || !titleForm.name.trim()) {
      setFormError("Please complete the title sponsor label and name.");
      return;
    }

    await persistSponsors({
      ...normalizedSponsors,
      titleSponsor: {
        label: titleForm.label.trim(),
        name: titleForm.name.trim(),
        imageFile: titleForm.imageFile.trim(),
      },
    });
  };

  const handleSavePremierPartner = async () => {
    if (!premierForm.name.trim()) {
      setFormError("Please enter a premier partner name.");
      return;
    }

    const nextPartners = [...normalizedSponsors.premierPartners];
    const nextPartner = {
      name: premierForm.name.trim(),
    };

    if (selectedIndex == null) {
      nextPartners.push(nextPartner);
    } else {
      nextPartners[selectedIndex] = nextPartner;
    }

    await persistSponsors({
      ...normalizedSponsors,
      premierPartners: nextPartners,
    });
  };

  const handleSaveSupportPartner = async () => {
    if (!supportForm.role.trim() || !supportForm.brand.trim()) {
      setFormError("Please enter the support partner role and brand.");
      return;
    }

    const nextPartners = [...normalizedSponsors.supportPartners];
    const nextPartner = {
      role: supportForm.role.trim(),
      brand: supportForm.brand.trim(),
      color: supportForm.color.trim() || "#334155",
      subline: supportForm.subline.trim(),
    };

    if (selectedIndex == null) {
      nextPartners.push(nextPartner);
    } else {
      nextPartners[selectedIndex] = nextPartner;
    }

    await persistSponsors({
      ...normalizedSponsors,
      supportPartners: nextPartners,
    });
  };

  const handleDeleteTitleSponsor = async () => {
    if (!window.confirm("Remove the title sponsor from the home page?")) {
      return;
    }

    await persistSponsors({
      ...normalizedSponsors,
      titleSponsor: null,
    });
  };

  const handleDeletePremierPartner = async (index) => {
    if (!window.confirm("Delete this premier partner?")) {
      return;
    }

    await persistSponsors({
      ...normalizedSponsors,
      premierPartners: normalizedSponsors.premierPartners.filter(
        (_partner, currentIndex) => currentIndex !== index
      ),
    });
  };

  const handleDeleteSupportPartner = async (index) => {
    if (!window.confirm("Delete this support partner?")) {
      return;
    }

    await persistSponsors({
      ...normalizedSponsors,
      supportPartners: normalizedSponsors.supportPartners.filter(
        (_partner, currentIndex) => currentIndex !== index
      ),
    });
  };

  return (
    <div className="space-y-6 bg-white">
      <input
        ref={titleLogoInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={handleTitleLogoChange}
      />

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      ) : null}

      <DashboardPanel title="Title Sponsor">
        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
            Loading sponsor content...
          </div>
        ) : normalizedSponsors.titleSponsor ? (
          <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <p className="font-condensed text-xs uppercase tracking-[0.18em] text-slate-500">
                {normalizedSponsors.titleSponsor.label}
              </p>
              <h3 className="mt-2 text-2xl font-semibold text-slate-900">
                {normalizedSponsors.titleSponsor.name}
              </h3>
              <div className="mt-5 flex items-center gap-3">
                <button
                  type="button"
                  onClick={openTitleModal}
                  className="rounded-xl bg-purple-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-purple-800"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={handleDeleteTitleSponsor}
                  disabled={saving}
                  className="rounded-xl bg-red-100 px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-200 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  Delete
                </button>
              </div>
            </div>

            <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white p-5">
              <img
                src={resolveSponsorImage(normalizedSponsors.titleSponsor.imageFile)}
                alt={normalizedSponsors.titleSponsor.name}
                className="max-h-[160px] w-full object-contain"
              />
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
            <p className="text-sm text-slate-500">
              No title sponsor is configured right now.
            </p>
            <button
              type="button"
              onClick={openTitleModal}
              className="mt-4 rounded-xl bg-purple-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-purple-800"
            >
              Add Title Sponsor
            </button>
          </div>
        )}
      </DashboardPanel>

      <DashboardPanel
        title={`Premier Partners (${normalizedSponsors.premierPartners.length})`}
        actionLabel="+ Add Partner"
        onAction={() => openPremierModal(null)}
      >
        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
            Loading premier partners...
          </div>
        ) : normalizedSponsors.premierPartners.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {normalizedSponsors.premierPartners.map((partner, index) => (
              <article
                key={`${partner.name}-${index}`}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_24px_rgba(15,23,42,0.06)]"
              >
                <p className="font-condensed text-xs uppercase tracking-[0.18em] text-slate-500">
                  Premier Partner
                </p>
                <h3 className="mt-2 text-xl font-semibold text-slate-900">
                  {partner.name}
                </h3>
                <div className="mt-5 flex gap-3">
                  <button
                    type="button"
                    onClick={() => openPremierModal(index)}
                    className="rounded-xl bg-purple-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-purple-800"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeletePremierPartner(index)}
                    disabled={saving}
                    className="rounded-xl bg-red-100 px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-200 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
            No premier partners are configured yet.
          </div>
        )}
      </DashboardPanel>

      <DashboardPanel
        title={`Support Partners (${normalizedSponsors.supportPartners.length})`}
        actionLabel="+ Add Support Partner"
        onAction={() => openSupportModal(null)}
      >
        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
            Loading support partners...
          </div>
        ) : normalizedSponsors.supportPartners.length > 0 ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {normalizedSponsors.supportPartners.map((partner, index) => (
              <article
                key={`${partner.role}-${partner.brand}-${index}`}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_24px_rgba(15,23,42,0.06)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-condensed text-xs uppercase tracking-[0.18em] text-slate-500">
                      {partner.role}
                    </p>
                    <h3
                      className="mt-2 text-xl font-black"
                      style={{ color: partner.color || "#334155" }}
                    >
                      {partner.brand}
                    </h3>
                    {partner.subline ? (
                      <p className="mt-2 text-sm text-slate-500">
                        {partner.subline}
                      </p>
                    ) : null}
                  </div>

                  <div
                    className="h-5 w-5 rounded-full border border-slate-200"
                    style={{ backgroundColor: partner.color || "#334155" }}
                    aria-hidden="true"
                  />
                </div>

                <div className="mt-5 flex gap-3">
                  <button
                    type="button"
                    onClick={() => openSupportModal(index)}
                    className="rounded-xl bg-purple-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-purple-800"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteSupportPartner(index)}
                    disabled={saving}
                    className="rounded-xl bg-red-100 px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-200 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
            No support partners are configured yet.
          </div>
        )}
      </DashboardPanel>

      {modalType === "title" ? (
        <ManagementModal title="EDIT TITLE SPONSOR" onClose={closeModal}>
          <div className="space-y-4">
            {formError ? (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                {formError}
              </div>
            ) : null}

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <img
                    src={titleSponsorPreview}
                    alt={titleForm.name || "Title sponsor preview"}
                    className="h-20 w-20 rounded-2xl border border-slate-200 bg-white object-contain p-2"
                  />
                  <p className="text-sm text-slate-500">
                    Upload a JPG, PNG, or WEBP sponsor image up to 5 MB.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleTitleLogoSelect}
                  disabled={uploading}
                  className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {uploading ? "Uploading..." : "Upload Logo"}
                </button>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm text-slate-500">Label</label>
                <input
                  name="label"
                  value={titleForm.label}
                  onChange={handleTitleInputChange}
                  className={getInputClass()}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-slate-500">Name</label>
                <input
                  name="name"
                  value={titleForm.name}
                  onChange={handleTitleInputChange}
                  className={getInputClass()}
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleSaveTitleSponsor}
                disabled={saving || uploading}
                className="rounded-xl bg-purple-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-purple-800 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {saving ? "Saving..." : "Update Sponsor"}
              </button>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-600 transition hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </ManagementModal>
      ) : null}

      {modalType === "premier" ? (
        <ManagementModal
          title={selectedIndex == null ? "ADD PREMIER PARTNER" : "EDIT PREMIER PARTNER"}
          onClose={closeModal}
          maxWidthClass="max-w-xl"
        >
          <div className="space-y-4">
            {formError ? (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                {formError}
              </div>
            ) : null}

            <div>
              <label className="mb-2 block text-sm text-slate-500">Partner Name</label>
              <input
                name="name"
                value={premierForm.name}
                onChange={handlePremierInputChange}
                className={getInputClass()}
              />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleSavePremierPartner}
                disabled={saving}
                className="rounded-xl bg-purple-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-purple-800 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {saving ? "Saving..." : selectedIndex == null ? "Add Partner" : "Update Partner"}
              </button>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-600 transition hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </ManagementModal>
      ) : null}

      {modalType === "support" ? (
        <ManagementModal
          title={selectedIndex == null ? "ADD SUPPORT PARTNER" : "EDIT SUPPORT PARTNER"}
          onClose={closeModal}
        >
          <div className="space-y-4">
            {formError ? (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                {formError}
              </div>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm text-slate-500">Role</label>
                <input
                  name="role"
                  value={supportForm.role}
                  onChange={handleSupportInputChange}
                  className={getInputClass()}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-slate-500">Brand</label>
                <input
                  name="brand"
                  value={supportForm.brand}
                  onChange={handleSupportInputChange}
                  className={getInputClass()}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-slate-500">Color</label>
                <input
                  name="color"
                  type="color"
                  value={supportForm.color}
                  onChange={handleSupportInputChange}
                  className="h-12 w-full rounded-xl border border-slate-200 bg-white px-2 py-2"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-slate-500">Subline</label>
                <input
                  name="subline"
                  value={supportForm.subline}
                  onChange={handleSupportInputChange}
                  className={getInputClass()}
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleSaveSupportPartner}
                disabled={saving}
                className="rounded-xl bg-purple-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-purple-800 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {saving ? "Saving..." : selectedIndex == null ? "Add Partner" : "Update Partner"}
              </button>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-600 transition hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </ManagementModal>
      ) : null}
    </div>
  );
}
