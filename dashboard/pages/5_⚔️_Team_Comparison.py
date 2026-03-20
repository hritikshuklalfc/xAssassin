import sys, os
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt

from config import get_supabase, PITCH_BG, NEON_GREEN, NEON_CYAN
from xAssassin.metrices import TacticalEngine

supabase = get_supabase()
engine = TacticalEngine()

# --- Configuration / Inputs ---
TEAM_A = "Liverpool"
TEAM_B = "Arsenal"

print("--- ⚔️ Team Comparison ---")

def fetch_team_events(team):
    resp = supabase.table("events").select("*").eq("team", team).limit(15000).execute()
    return pd.DataFrame(resp.data)

df_a, df_b = fetch_team_events(TEAM_A), fetch_team_events(TEAM_B)

def compute_metrics(df):
    passes = df[df["type"] == "Pass"]
    xt = engine.calculate_xt(df)
    return {
        "Total Passes": len(passes),
        "Shots": len(df[df["type"].isin(["MissedShots", "SavedShots", "Goal", "ShotOnPost"])]),
        "Goals": len(df[df["type"] == "Goal"]),
        "Total xT Added": round(xt["xt_added"].sum() if not xt.empty else 0, 2)
    }

metrics_a, metrics_b = compute_metrics(df_a), compute_metrics(df_b)

print("\n[ Key Metrics ]")
for key in metrics_a.keys():
    print(f"{key}: {TEAM_A} [{metrics_a[key]}] vs {TEAM_B} [{metrics_b[key]}]")

# --- Radar chart ---
labels = list(metrics_a.keys())
values_a, values_b = [float(metrics_a[k]) for k in labels], [float(metrics_b[k]) for k in labels]
max_vals = [max(a, b, 1) for a, b in zip(values_a, values_b)]
norm_a, norm_b = [a / m for a, m in zip(values_a, max_vals)], [b / m for b, m in zip(values_b, max_vals)]

angles = np.linspace(0, 2 * np.pi, len(labels), endpoint=False).tolist()
norm_a += norm_a[:1]
norm_b += norm_b[:1]
angles += angles[:1]

fig, ax = plt.subplots(figsize=(7, 7), subplot_kw=dict(polar=True))
fig.patch.set_facecolor(PITCH_BG); ax.set_facecolor(PITCH_BG)

ax.plot(angles, norm_a, color=NEON_GREEN, linewidth=2, label=TEAM_A)
ax.fill(angles, norm_a, color=NEON_GREEN, alpha=0.15)
ax.plot(angles, norm_b, color=NEON_CYAN, linewidth=2, label=TEAM_B)
ax.fill(angles, norm_b, color=NEON_CYAN, alpha=0.15)

ax.set_xticks(angles[:-1]); ax.set_xticklabels(labels, size=8, color="#c7d5cc")
ax.set_yticklabels([])
ax.legend(loc="upper right", bbox_to_anchor=(1.3, 1.1), fontsize=10)
plt.show()