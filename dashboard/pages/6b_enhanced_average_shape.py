"""
Enhanced Average Position & Formation Shape Visualization
SofaScore-style aesthetics with connecting lines and substitution analysis
"""

from pathlib import Path
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, Circle
from mplsoccer import Pitch
import ast
from scipy.spatial import distance_matrix

# ============================================================================
# CONFIGURATION
# ============================================================================

MATCH_ID = 1729191
DATA_PATH = Path(__file__).resolve().parents[2] / "data" / "raw_event" / f"match_{MATCH_ID}_events.csv"

# Visual style
DARK_MODE = True  # Set to False for light mode
MIN_TOUCHES = 10  # Minimum touches to include a player

# Colors
if DARK_MODE:
    BG_COLOR = '#0a1e2b'
    PITCH_COLOR = '#0f2636'
    LINE_COLOR = '#1a3a4f'
    TEXT_COLOR = '#e8e8e8'
    TEAM_A_COLOR = '#ff4655'
    TEAM_B_COLOR = '#00d9ff'
else:
    BG_COLOR = '#f8f8f8'
    PITCH_COLOR = '#1a8f4a'
    LINE_COLOR = '#ffffff'
    TEXT_COLOR = '#1a1a1a'
    TEAM_A_COLOR = '#c8102e'
    TEAM_B_COLOR = '#003da5'

# ============================================================================
# DATA LOADING & PREPROCESSING
# ============================================================================

def parse_qualifiers(qual_str):
    """Parse qualifier string to extract jersey number"""
    try:
        qual_list = ast.literal_eval(qual_str)
        for q in qual_list:
            if q.get('type', {}).get('displayName') == 'JerseyNumber':
                return q.get('value')
    except:
        pass
    return None

def extract_substitutions(df):
    """Extract substitution events and return player swaps"""
    subs_off = df[df["type"] == "SubstitutionOff"].copy()
    subs_on = df[df["type"] == "SubstitutionOn"].copy()

    substitutions = []
    for _, off_event in subs_off.iterrows():
        # Find corresponding ON event (same team, same minute)
        on_event = subs_on[
            (subs_on["team"] == off_event["team"]) &
            (subs_on["minute"] == off_event["minute"])
        ]

        if not on_event.empty:
            substitutions.append({
                'minute': int(off_event['minute']),
                'team': off_event['team'],
                'off': off_event['player'],
                'on': on_event.iloc[0]['player']
            })

    return sorted(substitutions, key=lambda x: x['minute'])

def get_player_jersey(df, player_name):
    """Extract jersey number for a player"""
    player_events = df[df["player"] == player_name]
    for _, event in player_events.iterrows():
        jersey = parse_qualifiers(event.get("qualifiers", "[]"))
        if jersey:
            return jersey
    # Fallback: use first letter of last name
    return player_name.split()[-1][0]

def calculate_average_positions(df, excluded_players=None, only_players=None):
    """Calculate average positions for players"""
    df = df.copy()
    df[["x", "y"]] = df[["x", "y"]].apply(pd.to_numeric, errors="coerce")

    # Filter to touches
    if "is_touch" in df.columns:
        touch_mask = df["is_touch"].astype(str).str.lower() == "true"
        touches = df[touch_mask].copy()
        if touches.empty:
            touches = df.dropna(subset=["player", "x", "y"]).copy()
    else:
        touches = df.dropna(subset=["player", "x", "y"]).copy()

    # Apply player filters
    if excluded_players:
        touches = touches[~touches["player"].isin(excluded_players)]
    if only_players:
        touches = touches[touches["player"].isin(only_players)]

    # Calculate averages (data is already normalized: low x = own goal)
    avg_positions = touches.groupby(['team', 'player']).agg(
        avg_x=('x', 'mean'),
        avg_y=('y', 'mean'),
        touches_count=('x', 'count')
    ).reset_index()

    # Filter minimum touches
    avg_positions = avg_positions[avg_positions['touches_count'] >= MIN_TOUCHES]

    # Add jersey numbers
    avg_positions['jersey'] = avg_positions['player'].apply(
        lambda p: get_player_jersey(df, p)
    )

    return avg_positions

def cluster_into_lines(players_df):
    """Group players into positional lines (Defense, Midfield, Attack)"""
    if len(players_df) < 3:
        return []

    # Sort by x position
    sorted_players = players_df.sort_values('avg_x').reset_index(drop=True)

    # Skip goalkeeper (lowest x)
    outfield = sorted_players.iloc[1:].copy()
    if len(outfield) < 2:
        return []

    # Calculate x gaps to detect line breaks
    outfield['x_diff'] = outfield['avg_x'].diff()
    threshold = outfield['x_diff'].quantile(0.65)  # Adaptive threshold

    # Group into lines
    lines = []
    current_line = [outfield.iloc[0]]

    for i in range(1, len(outfield)):
        if outfield.iloc[i]['x_diff'] > threshold:
            lines.append(current_line)
            current_line = [outfield.iloc[i]]
        else:
            current_line.append(outfield.iloc[i])
    lines.append(current_line)

    return lines

def get_line_centroids(lines):
    """Calculate centroid for each line"""
    centroids = []
    for line in lines:
        line_df = pd.DataFrame(line)
        centroid = (line_df['avg_x'].mean(), line_df['avg_y'].mean())
        centroids.append(centroid)
    return centroids

# ============================================================================
# VISUALIZATION
# ============================================================================

def draw_pitch_and_players(ax, team_data, team_name, color, show_connections=True):
    """Draw players on pitch with connecting lines"""

    # Draw pitch using mplsoccer
    pitch = Pitch(
        pitch_type='custom',
        pitch_length=105, pitch_width=68,
        pitch_color=PITCH_COLOR,
        line_color=LINE_COLOR,
        linewidth=2,
        line_zorder=1,
        stripe=False
    )
    pitch.draw(ax=ax)

    # Scale coordinates (data is 0-100, pitch is 0-105 and 0-68)
    team_data = team_data.copy()
    team_data['x_scaled'] = team_data['avg_x'] * 1.05
    team_data['y_scaled'] = team_data['avg_y'] * 0.68

    # Cluster into lines and draw connections
    if show_connections and len(team_data) >= 4:
        lines = cluster_into_lines(team_data)
        centroids = get_line_centroids(lines)

        # Draw connections between adjacent lines
        for i in range(len(centroids) - 1):
            x1, y1 = centroids[i]
            x2, y2 = centroids[i + 1]
            ax.plot(
                [x1 * 1.05, x2 * 1.05],
                [y1 * 0.68, y2 * 0.68],
                color=color,
                alpha=0.2,
                linewidth=2,
                linestyle='--',
                zorder=2
            )

        # Draw connections within lines
        for line in lines:
            if len(line) > 1:
                line_df = pd.DataFrame(line)
                for i, p1 in line_df.iterrows():
                    for j, p2 in line_df.iterrows():
                        if i < j:
                            ax.plot(
                                [p1['avg_x'] * 1.05, p2['avg_x'] * 1.05],
                                [p1['avg_y'] * 0.68, p2['avg_y'] * 0.68],
                                color=color,
                                alpha=0.12,
                                linewidth=1.5,
                                zorder=2
                            )

    # Draw player nodes
    for _, player in team_data.iterrows():
        x, y = player['x_scaled'], player['y_scaled']

        # Outer circle (glow effect)
        glow = Circle(
            (x, y), 2.5,
            facecolor=color,
            edgecolor='none',
            alpha=0.15,
            zorder=3
        )
        ax.add_patch(glow)

        # Main circle
        circle = Circle(
            (x, y), 1.8,
            facecolor=color,
            edgecolor='white',
            linewidth=2.5,
            alpha=0.95,
            zorder=4
        )
        ax.add_patch(circle)

        # Jersey number
        ax.text(
            x, y,
            str(player['jersey']),
            ha='center', va='center',
            fontsize=10,
            fontweight='bold',
            color='white',
            zorder=5,
            family='monospace'
        )

    # Add team label
    ax.text(
        52.5, 72,
        team_name.upper(),
        ha='center', va='bottom',
        fontsize=13,
        fontweight='bold',
        color=color,
        alpha=0.9
    )

    ax.set_xlim(-2, 107)
    ax.set_ylim(-2, 70)
    ax.axis('off')

def create_comparison_plot(df, substitutions, output_path='enhanced_avg_shape.png'):
    """Create side-by-side comparison: Starting XI vs Post-Substitution"""

    teams = sorted(df["team"].dropna().unique())
    if len(teams) < 2:
        print("Error: Need at least 2 teams")
        return

    team_A, team_B = teams[0], teams[1]

    # Calculate Starting XI positions (top 11 by touches)
    starting_positions = calculate_average_positions(df)

    # Get Starting XI for each team
    team_A_starters = starting_positions[starting_positions['team'] == team_A].nlargest(11, 'touches_count')
    team_B_starters = starting_positions[starting_positions['team'] == team_B].nlargest(11, 'touches_count')

    # Determine which substitution to analyze (first one with >30 min played)
    main_sub = None
    for sub in substitutions:
        if sub['minute'] < 60:  # Ensure enough time after sub
            main_sub = sub
            break

    if main_sub is None and substitutions:
        main_sub = substitutions[0]

    # Create figure
    if main_sub:
        fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(20, 10))
        fig.patch.set_facecolor(BG_COLOR)

        # LEFT: Starting XI
        draw_pitch_and_players(ax1, team_A_starters, f"{team_A} (Starting XI)", TEAM_A_COLOR)
        draw_pitch_and_players(ax1, team_B_starters, f"{team_B} (Starting XI)", TEAM_B_COLOR)

        ax1.text(
            52.5, -5,
            "STARTING FORMATION",
            ha='center', va='top',
            fontsize=11,
            fontweight='bold',
            color=TEXT_COLOR,
            alpha=0.6
        )

        # RIGHT: Post-Substitution
        # Calculate positions excluding subbed-off player
        post_sub_positions = calculate_average_positions(
            df[df['minute'] >= main_sub['minute']],
            excluded_players=[main_sub['off']]
        )

        if main_sub['team'] == team_A:
            team_A_post = post_sub_positions[post_sub_positions['team'] == team_A].nlargest(11, 'touches_count')
            team_B_post = team_B_starters
        else:
            team_A_post = team_A_starters
            team_B_post = post_sub_positions[post_sub_positions['team'] == team_B].nlargest(11, 'touches_count')

        draw_pitch_and_players(ax2, team_A_post, f"{team_A} (Post-Sub)", TEAM_A_COLOR)
        draw_pitch_and_players(ax2, team_B_post, f"{team_B} (Post-Sub)", TEAM_B_COLOR)

        ax2.text(
            52.5, -5,
            f"AFTER {main_sub['minute']}' SUB\n{main_sub['off']} → {main_sub['on']}",
            ha='center', va='top',
            fontsize=11,
            fontweight='bold',
            color=TEXT_COLOR,
            alpha=0.6
        )
    else:
        # No subs - just show starting XI
        fig, ax1 = plt.subplots(1, 1, figsize=(12, 10))
        fig.patch.set_facecolor(BG_COLOR)

        draw_pitch_and_players(ax1, team_A_starters, team_A, TEAM_A_COLOR)
        draw_pitch_and_players(ax1, team_B_starters, team_B, TEAM_B_COLOR)

        ax1.text(
            52.5, -5,
            "AVERAGE FORMATION & SHAPE",
            ha='center', va='top',
            fontsize=11,
            fontweight='bold',
            color=TEXT_COLOR,
            alpha=0.6
        )

    plt.tight_layout()
    plt.savefig(output_path, dpi=300, bbox_inches='tight', facecolor=BG_COLOR)
    print(f"✓ Saved: {output_path}")
    plt.close()

# ============================================================================
# MAIN EXECUTION
# ============================================================================

if __name__ == "__main__":
    print(f"Loading match {MATCH_ID}...")
    df = pd.read_csv(DATA_PATH)

    print("Extracting substitutions...")
    substitutions = extract_substitutions(df)
    print(f"  Found {len(substitutions)} substitutions:")
    for sub in substitutions:
        print(f"    {sub['minute']}' | {sub['team']}: {sub['off']} → {sub['on']}")

    print("\nGenerating visualization...")
    create_comparison_plot(df, substitutions)

    print("\n✓ Complete!")
