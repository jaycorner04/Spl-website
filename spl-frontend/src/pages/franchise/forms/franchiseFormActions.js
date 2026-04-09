import {
  createFranchise,
  patchFranchise,
  updateFranchise,
  uploadFranchiseLogo,
} from "../../../api/franchiseAPI";
import { createTeam, patchTeam } from "../../../api/teamsAPI";
import { createPlayer } from "../../../api/playersAPI";
import { getApiErrorMessage } from "../../../utils/apiErrors";

export const emptyFranchiseForm = {
  company_name: "",
  owner_name: "",
  address: "",
  website: "",
  logo: "",
};

export function mapFranchiseToForm(franchise) {
  return {
    company_name: franchise.company_name || "",
    owner_name: franchise.owner_name || "",
    address: franchise.address || "",
    website: franchise.website || "",
    logo: franchise.logo || "",
  };
}

export function buildFranchisePayload(form) {
  return {
    company_name: form.company_name.trim(),
    owner_name: form.owner_name.trim(),
    address: form.address.trim(),
    website: form.website.trim(),
    logo: form.logo || "",
  };
}

export function validateFranchiseForm({
  form,
  selectedTeamIds,
  draftTeams,
  playingXiLimit,
}) {
  if (!form.company_name.trim()) {
    return "Please enter a franchise name.";
  }

  if (selectedTeamIds.length + draftTeams.length > 3) {
    return "A franchise can only own up to 3 teams.";
  }

  for (const draftTeam of draftTeams) {
    if (!draftTeam.team_name.trim()) {
      return "Please enter a team name for each new franchise team.";
    }

    if (!draftTeam.city.trim()) {
      return `Please enter a city for ${draftTeam.team_name || "the new team"}.`;
    }

    if (!draftTeam.owner.trim()) {
      return `Please enter an owner for ${draftTeam.team_name || "the new team"}.`;
    }

    if (!draftTeam.vice_coach.trim()) {
      return `Please enter a captain for ${draftTeam.team_name || "the new team"}.`;
    }

    if (!draftTeam.venue.trim()) {
      return `Please enter a venue for ${draftTeam.team_name || "the new team"}.`;
    }

    if (Number.isNaN(Number(draftTeam.budget_left))) {
      return `Budget left must be a valid number for ${draftTeam.team_name || "the new team"}.`;
    }

    if (draftTeam.players.length < playingXiLimit) {
      return `${draftTeam.team_name || "Each new team"} must include at least ${playingXiLimit} players.`;
    }

    const playingXiCount = draftTeam.players.filter(
      (player) => player.squad_role === "Playing XI"
    ).length;

    if (playingXiCount !== playingXiLimit) {
      return `${draftTeam.team_name || "Each new team"} must keep exactly ${playingXiLimit} players in the Playing XI. Extra players can stay in Reserve for swaps.`;
    }

    for (const draftPlayer of draftTeam.players) {
      if (!draftPlayer.full_name.trim()) {
        return `Please enter a player name for ${draftTeam.team_name || "the new team"}.`;
      }
    }
  }

  return "";
}

export async function uploadFranchiseLogoForForm({
  event,
  selectedFranchise,
  modalType,
  setLogoUploadError,
  setUploadingLogo,
  setForm,
  syncUpdatedFranchise,
}) {
  const file = event.target.files?.[0];
  event.target.value = "";

  if (!file) {
    return;
  }

  if (!file.type.startsWith("image/")) {
    setLogoUploadError("Please choose a valid image file.");
    return;
  }

  if (file.size > 5 * 1024 * 1024) {
    setLogoUploadError("Image must be 5 MB or smaller.");
    return;
  }

  try {
    setUploadingLogo(true);
    setLogoUploadError("");

    const uploadResponse = await uploadFranchiseLogo(file);
    const nextLogoPath = uploadResponse.path || "";

    setForm((prev) => ({
      ...prev,
      logo: nextLogoPath,
    }));

    if (selectedFranchise?.id && modalType === "edit") {
      const updatedFranchise = await patchFranchise(selectedFranchise.id, {
        logo: nextLogoPath,
      });
      syncUpdatedFranchise(updatedFranchise);
    }
  } catch (uploadError) {
    setLogoUploadError(
      getApiErrorMessage(uploadError, "Unable to upload franchise logo.")
    );
  } finally {
    setUploadingLogo(false);
  }
}

export async function saveFranchiseForm({
  modalType,
  selectedFranchise,
  form,
  selectedTeamIds,
  draftTeams,
  teams,
  playingXiLimit,
  loadData,
  closeModal,
  setSaving,
  setFormError,
}) {
  const validationMessage = validateFranchiseForm({
    form,
    selectedTeamIds,
    draftTeams,
    playingXiLimit,
  });

  if (validationMessage) {
    setFormError(validationMessage);
    return;
  }

  try {
    setSaving(true);
    setFormError("");

    let savedFranchiseId = Number(selectedFranchise?.id || 0);

    if (modalType !== "add-team") {
      const payload = buildFranchisePayload(form);
      let savedFranchise;

      if (modalType === "add") {
        savedFranchise = await createFranchise(payload);
      } else {
        savedFranchise = await updateFranchise(selectedFranchise.id, payload);
      }

      savedFranchiseId = Number(savedFranchise?.id || selectedFranchise?.id || 0);
      const currentLinkedTeamIds = teams
        .filter(
          (team) => String(team.franchise_id || "") === String(savedFranchiseId)
        )
        .map((team) => Number(team.id));
      const nextLinkedTeamIds = selectedTeamIds.map((teamId) => Number(teamId));
      const unlinkTeamIds = currentLinkedTeamIds.filter(
        (teamId) => !nextLinkedTeamIds.includes(teamId)
      );
      const linkTeamIds = nextLinkedTeamIds.filter(
        (teamId) => !currentLinkedTeamIds.includes(teamId)
      );

      await Promise.all([
        ...unlinkTeamIds.map((teamId) =>
          patchTeam(teamId, {
            franchise_id: 0,
          })
        ),
        ...linkTeamIds.map((teamId) =>
          patchTeam(teamId, {
            franchise_id: savedFranchiseId,
          })
        ),
      ]);
    }

    if (!savedFranchiseId) {
      setFormError("Please choose a franchise before adding a team.");
      return;
    }

    for (const draftTeam of draftTeams) {
      const createdTeam = await createTeam({
        team_name: draftTeam.team_name.trim(),
        city: draftTeam.city.trim(),
        owner: draftTeam.owner.trim(),
        coach: draftTeam.coach.trim(),
        vice_coach: draftTeam.vice_coach.trim(),
        venue: draftTeam.venue.trim(),
        primary_color: draftTeam.primary_color,
        status: draftTeam.status,
        budget_left: Number(draftTeam.budget_left || 0),
        logo: "",
        franchise_id: savedFranchiseId,
      });

      for (const draftPlayer of draftTeam.players) {
        await createPlayer({
          full_name: draftPlayer.full_name.trim(),
          role: draftPlayer.role.trim(),
          squad_role: draftPlayer.squad_role || "Reserve",
          team_id: Number(createdTeam.id),
          team_name: createdTeam.team_name,
          batting_style: draftPlayer.batting_style.trim(),
          bowling_style: draftPlayer.bowling_style.trim(),
          photo: draftPlayer.photo || "",
          created_at: "",
          date_of_birth: "",
          mobile: draftPlayer.mobile.trim(),
          email: draftPlayer.email.trim(),
          status: "Active",
          salary: 0,
        });
      }
    }

    await loadData();
    closeModal();
  } catch (requestError) {
    setFormError(
      getApiErrorMessage(requestError, "Unable to save franchise details.")
    );
  } finally {
    setSaving(false);
  }
}
