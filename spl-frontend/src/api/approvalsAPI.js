import axiosInstance from "./axiosConfig";
import { notifyApprovalsUpdated } from "../utils/approvalSync";
import { notifyFranchisesUpdated } from "../utils/franchiseSync";
import { notifyTeamsUpdated } from "../utils/teamSync";

function getApprovalRefreshScope(approval) {
  const requestType = String(approval?.request_type || "").toLowerCase();
  const subject = String(approval?.subject || "").toLowerCase();
  const notes = String(approval?.notes || "").toLowerCase();
  const combined = `${requestType} ${subject} ${notes}`;

  if (
    combined.includes("__spl_franchise_reg__") ||
    ["franchise", "budget", "finance", "sponsor", "owner", "ownership"].some(
      (keyword) => combined.includes(keyword)
    )
  ) {
    return "franchises";
  }

  if (
    ["team", "match", "fixture", "lineup", "venue"].some((keyword) =>
      combined.includes(keyword)
    )
  ) {
    return "teams";
  }

  return "approvals";
}

function notifyApprovalSideEffects(approval) {
  notifyApprovalsUpdated();

  const refreshScope = getApprovalRefreshScope(approval);

  if (refreshScope === "franchises") {
    notifyFranchisesUpdated();
  }

  if (refreshScope === "teams") {
    notifyTeamsUpdated();
  }
}

export async function getApprovals(params = {}) {
  const response = await axiosInstance.get("/api/approvals/", { params });
  return response.data;
}

export async function patchApproval(id, payload) {
  const response = await axiosInstance.patch(`/api/approvals/${id}/`, payload);
  notifyApprovalSideEffects(response.data);
  return response.data;
}

export async function updateApproval(id, payload) {
  const response = await axiosInstance.put(`/api/approvals/${id}/`, payload);
  notifyApprovalSideEffects(response.data);
  return response.data;
}
