import { getAuthUser } from "../../utils/authStorage";

const NOTICE_COPY = {
  ops_manager: {
    matches: {
      title: "Access Limited",
      message:
        "You can manage match operations and live match controls only. League-wide approvals, franchises, finance, and global admin changes remain with Super Admin.",
    },
    "live-match": {
      title: "Access Limited",
      message:
        "You can manage live match operations only. League-wide approvals, franchises, finance, and global admin changes remain with Super Admin.",
    },
  },
  scorer: {
    "live-match": {
      title: "Access Limited",
      message:
        "You can control live scoring only. League setup, approvals, finance, and global admin changes remain with Super Admin.",
    },
  },
  finance_admin: {
    finance: {
      title: "Access Limited",
      message:
        "You can manage finance records and settlements only. Approvals, franchise operations, match operations, and league-wide edits remain with Super Admin.",
    },
  },
  franchise_admin: {
    franchise: {
      title: "Access Limited",
      message:
        "You can manage only your franchise, teams, and players. Approval, public homepage visibility, and league-wide governance remain with Super Admin.",
    },
  },
};

export default function AccessLimitedNotice({ scope }) {
  const authUser = getAuthUser();
  const notice = NOTICE_COPY[authUser?.role]?.[scope];

  if (!notice || authUser?.role === "super_admin") {
    return null;
  }

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
      <p className="font-condensed text-sm font-bold uppercase tracking-[0.16em] text-amber-700">
        {notice.title}
      </p>
      <p className="mt-2 text-sm text-amber-800">{notice.message}</p>
    </div>
  );
}
