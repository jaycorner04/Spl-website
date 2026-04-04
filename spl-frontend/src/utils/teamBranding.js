import {
  SiFlipkart,
  SiHcl,
  SiInfosys,
  SiMahindra,
  SiPaytm,
  SiRelianceindustrieslimited,
  SiTata,
  SiTcs,
  SiWipro,
  SiZoho,
} from "react-icons/si";

export function getShortName(teamName = "") {
  return teamName
    .split(" ")
    .map((word) => word[0])
    .join("")
    .slice(0, 3)
    .toUpperCase();
}

export function getFallbackColor(primaryColor = "") {
  const colorMap = {
    orange: "#F97316",
    black: "#111827",
    pink: "#EC4899",
    blue: "#2563EB",
    red: "#DC2626",
    gold: "#EAB308",
    yellow: "#EAB308",
    darkblue: "#1E3A8A",
    drakblue: "#1E3A8A",
    brijal: "#7C3AED",
  };

  return colorMap[String(primaryColor).toLowerCase()] || "#334155";
}

export const homePageTeamReference = [
  { teamName: "Wipro", brandIcon: SiWipro, logoColor: "#173a67", color: "#173a67", points: 12, nrr: "+1.243", wins: 6, losses: 2 },
  { teamName: "Infosys", brandIcon: SiInfosys, logoColor: "#0072ce", color: "#0072ce", points: 10, nrr: "+0.812", wins: 5, losses: 3 },
  { teamName: "HCL", brandIcon: SiHcl, logoColor: "#0f6caa", color: "#0f6caa", points: 10, nrr: "+0.411", wins: 5, losses: 3 },
  { teamName: "TCS", brandIcon: SiTcs, logoColor: "#23262d", color: "#23262d", points: 8, nrr: "-0.091", wins: 4, losses: 4 },
  { teamName: "Zoho", brandIcon: SiZoho, logoColor: "#e42527", color: "#e42527", points: 8, nrr: "-0.233", wins: 4, losses: 4 },
  { teamName: "Reliance", brandIcon: SiRelianceindustrieslimited, logoColor: "#c6a04d", color: "#0c3a69", points: 6, nrr: "-0.517", wins: 3, losses: 5 },
  { teamName: "Paytm", brandIcon: SiPaytm, logoColor: "#00baf2", color: "#00baf2", points: 6, nrr: "-0.602", wins: 3, losses: 5 },
  { teamName: "Mahindra", brandIcon: SiMahindra, logoColor: "#d71920", color: "#d71920", points: 4, nrr: "-0.844", wins: 2, losses: 6 },
  { teamName: "Flipkart", brandIcon: SiFlipkart, logoColor: "#2874f0", color: "#2874f0", points: 4, nrr: "-1.011", wins: 2, losses: 6 },
  { teamName: "Tata", brandIcon: SiTata, logoColor: "#2c4a9a", color: "#2c4a9a", points: 2, nrr: "-1.244", wins: 1, losses: 7 },
];

export function findTeamBrandReference(teamName = "") {
  return (
    homePageTeamReference.find(
      (item) => item.teamName.toLowerCase() === String(teamName).toLowerCase()
    ) || null
  );
}

export function getTeamBrandReference(teamName = "", index = 0) {
  return (
    findTeamBrandReference(teamName) ||
    homePageTeamReference[index % homePageTeamReference.length]
  );
}
