import sys, os
import pandas as pd
import matplotlib.pyplot as plt
from mplsoccer import Pitch

# Mocking your internal config imports
from config import get_supabase, PITCH_BG, PITCH_LINE, NEON_GREEN

supabase = get_supabase()

# --- Configuration / Inputs ---
ANALYSIS_MODE = "Single Match"  # Or "Full Season"
MATCH_ID = 1821050
SELECTED_TEAM = "Liverpool"
SELECTED_PLAYER = "Trent Alexander-Arnold"

print("--- 🎯 Pass Maps ---")

def fetch_match_data(m_id):
    response = supabase.table("events").select("*").eq("game_id", m_id).execute()
    return pd.DataFrame(response.data)

def fetch_team_passes(team):
    response = (supabase.table("events").select("*").eq("team", team)
                .eq("type", "Pass").ilike("outcome_type", "successful")
                .limit(15000).execute())
    return pd.DataFrame(response.data)

if ANALYSIS_MODE == "Single Match":
    match_df = fetch_match_data(MATCH_ID)
    if not match_df.empty:
        df_passes = match_df[
            (match_df["player"] == SELECTED_PLAYER) & 
            (match_df["type"] == "Pass") & 
            (match_df["outcome_type"].str.lower() == "successful")
        ]
        alpha_val = 0.8
    else:
        df_passes = pd.DataFrame()
        print("Warning: No data found for this Match ID.")
else:
    team_df = fetch_team_passes(SELECTED_TEAM)
    if not team_df.empty:
        df_passes = team_df[team_df["player"] == SELECTED_PLAYER]
        alpha_val = 0.1
    else:
        df_passes = pd.DataFrame()
        print("Warning: No data found for this team yet.")

# --- Render ---
if not df_passes.empty:
    print(f"Player: {SELECTED_PLAYER} | Passes: {len(df_passes)} | Mode: {ANALYSIS_MODE}")

    pitch = Pitch(pitch_type="opta", pitch_color=PITCH_BG, line_color=PITCH_LINE)
    fig, ax = pitch.draw(figsize=(12, 8))

    pitch.arrows(
        df_passes.x, df_passes.y,
        df_passes.end_x, df_passes.end_y,
        width=2, headwidth=4, headlength=4,
        color=NEON_GREEN, alpha=alpha_val, ax=ax,
    )
    plt.show()
else:
    print("No passes found for this player.")