import sys, os
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from matplotlib.colors import LinearSegmentedColormap
from mplsoccer import Pitch

from config import get_supabase, PITCH_BG, PITCH_LINE, NEON_ORANGE
from xAssassin.metrices import TacticalEngine

supabase = get_supabase()
engine = TacticalEngine()

# --- Configuration / Inputs ---
MODE = "Single Match"
MATCH_ID = 1821050
SELECTED_TEAM = "Liverpool"
HIGHLIGHT_PLAYER = "All Players"

print("--- 🔥 Expected Threat (xT) ---")

def fetch_match(m_id):
    resp = supabase.table("events").select("*").eq("game_id", m_id).execute()
    return pd.DataFrame(resp.data)

def fetch_team_events(team):
    resp = (supabase.table("events").select("*").eq("team", team).eq("type", "Pass")
            .ilike("outcome_type", "successful").limit(15000).execute())
    return pd.DataFrame(resp.data)

if MODE == "Single Match":
    df = fetch_match(MATCH_ID)
    if not df.empty: df = df[df["team"] == SELECTED_TEAM]
else:
    df = fetch_team_events(SELECTED_TEAM)

if df.empty: sys.exit("No data found.")

# --- xT leaderboard ---
xt_board = engine.calculate_xt(df)
print("\n[ xT Leaderboard ]")
print(xt_board if not xt_board.empty else "No xT data.")

# --- xT Heatmap ---
passes = df[(df["type"] == "Pass") & (df["outcome_type"].str.lower() == "successful")].copy()

if not passes.empty:
    if HIGHLIGHT_PLAYER != "All Players":
        passes = passes[passes["player"] == HIGHLIGHT_PLAYER]

    xt_grid_vals = np.zeros((8, 12))
    for _, row in passes.iterrows():
        try:
            ex, ey = float(row["end_x"]), float(row["end_y"])
            x_idx_end = min(int((ex / 100) * 12), 11)
            y_idx_end = min(int((ey / 100) * 8), 7)
            xt_grid_vals[y_idx_end][x_idx_end] += 1
        except: continue

    pitch = Pitch(pitch_type="opta", pitch_color=PITCH_BG, line_color=PITCH_LINE)
    fig, ax = pitch.draw(figsize=(12, 8))

    cmap = LinearSegmentedColormap.from_list("xT", ["#1e1e1e", "#2a3a1e", "#3a6b1e", NEON_ORANGE, "#ff2d2d"], N=256)
    x_edges = np.linspace(0, 100, 13)
    y_edges = np.linspace(0, 100, 9)

    ax.pcolormesh(x_edges, y_edges, xt_grid_vals, cmap=cmap, alpha=0.7, zorder=1, shading="flat")
    plt.show()