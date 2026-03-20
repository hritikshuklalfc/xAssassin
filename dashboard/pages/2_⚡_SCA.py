import sys, os
import pandas as pd
import matplotlib.pyplot as plt
from mplsoccer import Pitch

from config import get_supabase, PITCH_BG, PITCH_LINE, NEON_CYAN, NEON_GREEN
from xAssassin.metrices import TacticalEngine

supabase = get_supabase()
engine = TacticalEngine()

# --- Configuration / Inputs ---
MATCH_ID = 1821050
SELECTED_TEAM = "Liverpool"
HIGHLIGHT_PLAYER = "All Players" # Or specific name

print("--- ⚡ Shot-Creating Actions ---")

def fetch_match_data(m_id):
    response = supabase.table("events").select("*").eq("game_id", m_id).execute()
    return pd.DataFrame(response.data)

match_df = fetch_match_data(MATCH_ID)

if match_df.empty:
    print("Warning: No data found for this Match ID.")
    sys.exit()

# --- Calculate SCA ---
team_df = match_df[match_df["team"] == SELECTED_TEAM].copy()
sca_board = engine.calculate_sca(match_df)

team_players = team_df["player"].dropna().unique().tolist()
sca_team = sca_board[sca_board["Player"].isin(team_players)].reset_index(drop=True)

print("\n[ SCA Leaderboard ]")
if not sca_team.empty:
    sca_team.index += 1
    print(sca_team)
else:
    print("No shot-creating actions found.")

# --- SCA Pitch Map ---
shot_conditions = match_df["type"].isin(["MissedShots", "SavedShots", "Goal"])
shot_indices = match_df.sort_values(by=["minute", "second"]).reset_index(drop=True)
shot_indices_idx = shot_indices[shot_conditions].index

sca_events = []
for idx in shot_indices_idx:
    if shot_indices.loc[idx, "team"] != SELECTED_TEAM: continue
    for offset in [1, 2]:
        if idx - offset >= 0:
            action = shot_indices.loc[idx - offset]
            if action["team"] == SELECTED_TEAM: sca_events.append(action)

if sca_events:
    sca_df = pd.DataFrame(sca_events)
    if HIGHLIGHT_PLAYER != "All Players":
        sca_df = sca_df[sca_df["player"] == HIGHLIGHT_PLAYER]

    pitch = Pitch(pitch_type="opta", pitch_color=PITCH_BG, line_color=PITCH_LINE)
    fig, ax = pitch.draw(figsize=(12, 8))

    plot_df = sca_df.dropna(subset=["x", "y", "end_x", "end_y"])
    if not plot_df.empty:
        pitch.arrows(
            plot_df.x, plot_df.y, plot_df.end_x, plot_df.end_y,
            width=2, headwidth=5, headlength=4,
            color=NEON_CYAN, alpha=0.75, ax=ax,
        )
        pitch.scatter(
            plot_df.end_x, plot_df.end_y,
            s=80, color=NEON_GREEN, edgecolors="white", linewidth=0.8, zorder=3, ax=ax,
        )
    plt.show()