from pathlib import Path
import pandas as pd
import matplotlib.pyplot as plt

MATCH_ID = 1729191
DATA_PATH = Path(__file__).resolve().parents[2] / "data" / "raw_event" / f"match_{MATCH_ID}_events.csv"
df = pd.read_csv(DATA_PATH)

df[["x", "y"]] = df[["x", "y"]].apply(pd.to_numeric, errors="coerce")
df["period"] = df["period"].astype(str)

if "is_touch" in df.columns:
    touch_mask = df["is_touch"].astype(str).str.lower() == "true"
    touches = df[touch_mask].copy()
    if touches.empty:
        touches = df.dropna(subset=["player", "x", "y"]).copy()
else:
    touches = df.dropna(subset=["player", "x", "y"]).copy()

teams = pd.Index(sorted(touches["team"].dropna().unique()))
team_A, team_B = (teams[0], teams[1] if len(teams) > 1 else teams[0])

h1_touches = touches[touches["period"].str.contains("first", case=False, na=False)]
team_A_h1_x = h1_touches[h1_touches["team"] == team_A]["x"].median()
team_A_defends_left_h1 = False if pd.isna(team_A_h1_x) else team_A_h1_x < 50
# ... keep the standardize_coords + plotting code ...

def standardize_coords(row):
    team = row['team']
    period = row['period']
    x = row['x']
    y = row['y']
    
    # We want Team A to ALWAYS defend the Left goal (attacking L -> R)
    # We want Team B to ALWAYS defend the Right goal (attacking R -> L)
    
    if team == team_A:
        if team_A_defends_left_h1:
            if period == 'FirstHalf':
                return x, y
            else:
                return 100 - x, 100 - y # Flip for second half
        else:
            if period == 'FirstHalf':
                return 100 - x, 100 - y # Flip to make them defend left
            else:
                return x, y
    else: # team_B
        if not team_A_defends_left_h1:
            # Team B is defending Left in H1. We want them defending Right.
            if period == 'FirstHalf':
                return 100 - x, 100 - y # Flip so they defend right
            else:
                return x, y
        else:
            # Team B is defending Right in H1. Perfect.
            if period == 'FirstHalf':
                return x, y
            else:
                return 100 - x, 100 - y # Flip H2 so they stay defending right

# Apply standardization
touches[['std_x', 'std_y']] = touches.apply(lambda row: pd.Series(standardize_coords(row)), axis=1)

# Calculate average positions using the standardized coordinates
avg_positions = touches.groupby(['team', 'player']).agg(
    avg_x=('std_x', 'mean'),
    avg_y=('std_y', 'mean'),
    touches=('std_x', 'count')
).reset_index()

# Filter out players with very few touches
avg_positions = avg_positions[avg_positions['touches'] >= 10]

# Setup the pitch
fig, ax = plt.subplots(figsize=(12, 7.5))
ax.set_facecolor('#2b2b2b') # Darker tactical theme
fig.patch.set_facecolor('#2b2b2b')

# Pitch Outlines & Centre Line
ax.plot([0, 0, 100, 100, 0], [0, 100, 100, 0, 0], color='white', linewidth=2, alpha=0.3)
ax.plot([50, 50], [0, 100], color='white', linewidth=2, alpha=0.3)

# Centre Circle
centre_circle = plt.Circle((50, 50), 9.15, color='white', fill=False, linewidth=2, alpha=0.3)
ax.add_patch(centre_circle)
centre_spot = plt.Circle((50, 50), 0.5, color='white', alpha=0.3)
ax.add_patch(centre_spot)

# Penalty Areas
ax.plot([0, 17, 17, 0], [21.1, 21.1, 78.9, 78.9], color='white', linewidth=2, alpha=0.3)
ax.plot([100, 83, 83, 100], [21.1, 21.1, 78.9, 78.9], color='white', linewidth=2, alpha=0.3)

# 6-yard boxes
ax.plot([0, 5.8, 5.8, 0], [36.8, 36.8, 63.2, 63.2], color='white', linewidth=2, alpha=0.3)
ax.plot([100, 94.2, 94.2, 100], [36.8, 36.8, 63.2, 63.2], color='white', linewidth=2, alpha=0.3)

colors = ['#ff4b4b', '#4b88ff'] # Red for Team A, Blue for Team B

for i, team in enumerate([team_A, team_B]):
    team_data = avg_positions[avg_positions['team'] == team]
    
    ax.scatter(team_data['avg_x'], team_data['avg_y'], 
               c=colors[i], s=team_data['touches'] * 5, 
               label=team, alpha=0.9, edgecolors='white', linewidth=1.5, zorder=5)
    
    for _, row in team_data.iterrows():
        name = str(row['player']).split()[-1]
        ax.text(row['avg_x'], row['avg_y'] + 2.5, name, 
                ha='center', va='center', fontsize=9, color='white', 
                weight='bold', zorder=6, 
                bbox=dict(facecolor='black', alpha=0.6, edgecolor='none', boxstyle='round,pad=0.2'))

# Add tactical notes
ax.text(25, 105, f'{team_A} (Attacking ->)', color=colors[0], fontsize=14, weight='bold', ha='center')
ax.text(75, 105, f'<- Attacking) {team_B}', color=colors[1], fontsize=14, weight='bold', ha='center')

ax.set_title('Standardized Head-to-Head Average Shape', fontsize=18, color='white', weight='bold', y=1.08)
plt.axis('off')

# Save figure
plt.savefig('split_pitch_shape.png', bbox_inches='tight', dpi=300)
plt.close()