export const LIVE_MATCH_STORAGE_KEY = "spl_live_match_state";

export const defaultLiveMatchState = {
  matchTitle: "Wipro vs Infosys",
  venue: "SPL Main Stadium, Hyderabad",
  battingTeam: "Wipro",
  bowlingTeam: "Infosys",
  score: 142,
  wickets: 4,
  overs: 17,
  balls: 3,
  target: 168,
  strikerId: 1,
  nonStrikerId: 2,
  batters: [
    {
      id: 1,
      name: "Abhishek",
      role: "BAT",
      runs: 42,
      balls: 29,
      fours: 5,
      sixes: 1,
      status: "batting",
    },
    {
      id: 2,
      name: "Suraj",
      role: "AR",
      runs: 31,
      balls: 24,
      fours: 3,
      sixes: 1,
      status: "batting",
    },
    {
      id: 3,
      name: "Rohit Verma",
      role: "BAT",
      runs: 0,
      balls: 0,
      fours: 0,
      sixes: 0,
      status: "yet_to_bat",
    },
    {
      id: 4,
      name: "Karthik Reddy",
      role: "AR",
      runs: 0,
      balls: 0,
      fours: 0,
      sixes: 0,
      status: "yet_to_bat",
    },
    {
      id: 5,
      name: "Aditya Rao",
      role: "WK",
      runs: 0,
      balls: 0,
      fours: 0,
      sixes: 0,
      status: "yet_to_bat",
    },
    {
      id: 6,
      name: "Naveen Kumar",
      role: "BOWL",
      runs: 0,
      balls: 0,
      fours: 0,
      sixes: 0,
      status: "yet_to_bat",
    },
  ],
  bowler: {
    name: "Viswanadh",
    overs: 3,
    balls: 4,
    runs: 28,
    wickets: 1,
  },
  currentOverBalls: ["1", "4", "W"],
  ballHistory: [
    { over: "17.1", result: "1", text: "Abhishek worked a single to long-on" },
    { over: "17.2", result: "4", text: "Suraj drilled a boundary through cover" },
    { over: "17.3", result: "W", text: "Viswanadh struck to break the stand" },
  ],
  updatedAt: Date.now(),
};

export function loadLiveMatchState() {
  try {
    const stored = localStorage.getItem(LIVE_MATCH_STORAGE_KEY);
    if (!stored) return defaultLiveMatchState;

    const parsed = JSON.parse(stored);
    return {
      ...defaultLiveMatchState,
      ...parsed,
    };
  } catch {
    return defaultLiveMatchState;
  }
}

export function saveLiveMatchState(state) {
  try {
    localStorage.setItem(
      LIVE_MATCH_STORAGE_KEY,
      JSON.stringify({
        ...state,
        updatedAt: Date.now(),
      })
    );
  } catch (error) {
    console.error("Failed to save live match state", error);
  }
}
