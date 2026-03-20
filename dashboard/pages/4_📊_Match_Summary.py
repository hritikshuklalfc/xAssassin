import sys, os
import pandas as pd
import matplotlib.pyplot as plt
from mplsoccer import Pitch

from config import get_supabase, PITCH_BG, PITCH_LINE, NEON_GREEN, NEON_CYAN, NEON_ORANGE, NEON_YELLOW

supabase = get_supabase()

# --- Configuration / Inputs ---
MATCH_ID = 1821050

print("--- 📊 Match Summary ---")

def fetch_match(m_id):
    resp = supabase.table("events").select("*").eq("game_id", m_id).execute()
    return pd.DataFrame(resp.data)

df = fetch_match(MATCH_ID)
if df.empty: sys.exit("Warning: No data found.")

teams = sorted(df["team"].dropna().unique().tolist())
team_a, team_b = teams[0], teams[1]
print(f"\nMatch: {team_a} vs {team_b}")

def team_stats(team):
    t = df[df["team"] == team]
    passes = t[t["type"] == "Pass"]
    succ_passes = passes[passes["outcome_type"].str.lower() == "successful"]
    shots = t[t["type"].isin(["MissedShots", "SavedShots", "Goal", "ShotOnPost"])]
    return {
        "Total Passes": len(passes),
        "Pass Accuracy": f"{(len(succ_passes) / max(len(passes), 1) * 100):.0f}%",
        "Shots": len(shots),
        "Goals": len(t[t["type"] == "Goal"]),
        "Fouls": len(t[t["type"] == "Foul"])
    }

stats_a, stats_b = team_stats(team_a), team_stats(team_b)
print("\n[ Head to Head Stats ]")
for label in stats_a.keys():
    print(f"{label}: {stats_a[label]} ({team_a})  |  {stats_b[label]} ({team_b})")

# --- Shot map ---
shots_df = df[df["type"].isin(["MissedShots", "SavedShots", "Goal", "ShotOnPost"])].dropna(subset=["x", "y"])

pitch = Pitch(pitch_type="opta", pitch_color=PITCH_BG, line_color=PITCH_LINE, half=True)
fig, ax = pitch.draw(figsize=(12, 7))

colors = {"Goal": NEON_GREEN, "SavedShots": NEON_CYAN, "MissedShots": NEON_ORANGE, "ShotOnPost": NEON_YELLOW}
markers = {"Goal": "*", "SavedShots": "o", "MissedShots": "X", "ShotOnPost": "D"}

for event_type, group in shots_df.groupby("type"):
    g = group.copy()
    g.loc[g["team"] == team_a, "x"] = 100 - g.loc[g["team"] == team_a, "x"]
    g.loc[g["team"] == team_a, "y"] = 100 - g.loc[g["team"] == team_a, "y"]
    ax.scatter(
        g["x"].astype(float), g["y"].astype(float),
        s=120, c=colors.get(event_type, "#fff"), marker=markers.get(event_type, "o"), 
        edgecolors="white", linewidth=0.8, zorder=3, label=event_type, alpha=0.85,
    )

ax.legend(loc="lower left", fontsize=9, facecolor=PITCH_BG, edgecolor="#3a3a4a", labelcolor="#c7d5cc")
plt.show()