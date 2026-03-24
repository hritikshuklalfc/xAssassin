"""
Enhanced Formation Analyzer with SofaScore-style Visualization
Handles data cleaning, jersey number extraction, and formation visualization
"""

import json
import ast
from pathlib import Path
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, Circle
from mplsoccer import Pitch


class FormationAnalyzer:
    """
    Robust formation visualization with safe data parsing and cleaning.
    """

    def __init__(self, dark_mode=True, min_touches=10):
        """
        Initialize the analyzer.

        Args:
            dark_mode: Boolean, whether to use dark color scheme
            min_touches: Minimum touch count to include a player
        """
        self.dark_mode = dark_mode
        self.min_touches = min_touches
        self._setup_colors()

    def _setup_colors(self):
        """Setup color palette based on theme."""
        if self.dark_mode:
            self.colors = {
                'bg': '#0a1e2b',
                'pitch': '#0f2636',
                'line': '#1a3a4f',
                'text': '#e8e8e8',
                'team_a': '#ff4655',
                'team_b': '#00d9ff',
            }
        else:
            self.colors = {
                'bg': '#f8f8f8',
                'pitch': '#1a8f4a',
                'line': '#ffffff',
                'text': '#1a1a1a',
                'team_a': '#c8102e',
                'team_b': '#003da5',
            }

    @staticmethod
    def _parse_qualifiers_safe(qual_str):
        """
        Safely parse stringified qualifier dictionaries.
        Handles single-quoted Python dicts that can't be parsed as JSON.

        Args:
            qual_str: String representation of qualifiers list

        Returns:
            List of dictionaries, or empty list if parsing fails
        """
        if not qual_str or qual_str == '[]' or pd.isna(qual_str):
            return []

        try:
            # Try standard ast.literal_eval first (safest)
            return ast.literal_eval(str(qual_str))
        except (ValueError, SyntaxError):
            try:
                # Fallback: replace single quotes with double quotes for JSON parsing
                # But be careful with nested structures
                sanitized = str(qual_str).replace("'", '"')
                return json.loads(sanitized)
            except (json.JSONDecodeError, TypeError):
                return []

    @staticmethod
    def _extract_jersey_number(event_row):
        """
        Extract jersey number from a single event row.

        Args:
            event_row: DataFrame row with 'qualifiers' and 'player' columns

        Returns:
            Jersey number as string, or first letter of last name as fallback
        """
        qualifiers = FormationAnalyzer._parse_qualifiers_safe(
            event_row.get('qualifiers', '[]')
        )

        for q in qualifiers:
            if isinstance(q, dict):
                type_info = q.get('type', {})
                if isinstance(type_info, dict):
                    display_name = type_info.get('displayName')
                    if display_name == 'JerseyNumber':
                        jersey_val = q.get('value')
                        if jersey_val is not None:
                            return str(int(jersey_val))

        # Fallback: first letter of last name
        player_name = event_row.get('player')
        if player_name:
            try:
                return player_name.split()[-1][0]
            except (IndexError, AttributeError):
                pass

        return '?'

    def clean_match_data(self, df):
        """
        Robustly clean and prepare match data.

        Args:
            df: Raw match DataFrame

        Returns:
            Cleaned DataFrame with proper types and no missing essentials
        """
        df = df.copy()

        # Convert coordinates to numeric, handling missing values
        for col in ['x', 'y', 'end_x', 'end_y']:
            if col in df.columns:
                df[col] = pd.to_numeric(df[col], errors='coerce')

        # Ensure team and player columns exist
        if 'team' not in df.columns:
            raise ValueError("DataFrame must contain 'team' column")
        if 'player' not in df.columns:
            df['player'] = ''

        # Mark touches robustly
        if 'is_touch' in df.columns:
            df['is_touch'] = df['is_touch'].astype(str).str.lower() == 'true'
        else:
            # If no is_touch column, create one: events with player, x, y are touches
            df['is_touch'] = (
                df['player'].notna() &
                df['player'].str.len() > 0 &
                df['x'].notna() &
                df['y'].notna()
            )

        return df

    def extract_substitutions(self, df):
        """
        Extract substitution events and match off/on pairs.

        Args:
            df: Cleaned match DataFrame

        Returns:
            List of substitution dictionaries with minute, team, off, on
        """
        if 'type' not in df.columns or 'minute' not in df.columns:
            return []

        subs_off = df[df['type'] == 'SubstitutionOff'].copy()
        subs_on = df[df['type'] == 'SubstitutionOn'].copy()

        if subs_off.empty or subs_on.empty:
            return []

        substitutions = []
        for _, off_event in subs_off.iterrows():
            # Find corresponding ON event (same team, same minute)
            on_events = subs_on[
                (subs_on['team'] == off_event['team']) &
                (subs_on['minute'] == off_event['minute'])
            ]

            if not on_events.empty:
                substitutions.append({
                    'minute': int(off_event['minute']),
                    'team': off_event['team'],
                    'off': off_event['player'],
                    'on': on_events.iloc[0]['player']
                })

        return sorted(substitutions, key=lambda x: x['minute'])

    def calculate_average_positions(self, df, excluded_players=None, only_players=None):
        """
        Calculate average positions for all players.

        Args:
            df: Cleaned match DataFrame
            excluded_players: List of player names to exclude
            only_players: List of player names to include (if set, excludes all others)

        Returns:
            DataFrame with columns: team, player, avg_x, avg_y, touches_count, jersey, is_starter
        """
        touches = df[df['is_touch']].copy()

        if touches.empty:
            return pd.DataFrame()

        # Apply player filters
        if excluded_players:
            touches = touches[~touches['player'].isin(excluded_players)]
        if only_players:
            touches = touches[touches['player'].isin(only_players)]

        # Calculate averages
        avg_positions = touches.groupby(['team', 'player']).agg(
            avg_x=('x', 'mean'),
            avg_y=('y', 'mean'),
            touches_count=('x', 'count')
        ).reset_index()

        # Filter minimum touches
        avg_positions = avg_positions[avg_positions['touches_count'] >= self.min_touches]

        # Add jersey numbers
        avg_positions['jersey'] = avg_positions.apply(
            lambda row: self._parse_and_extract_jersey(df, row['player']),
            axis=1
        )

        # Identify starters: top 11 players by touch count per team
        starters = set()
        for team in avg_positions['team'].unique():
            team_players = avg_positions[avg_positions['team'] == team].nlargest(11, 'touches_count')
            starters.update(team_players['player'].tolist())

        avg_positions['is_starter'] = avg_positions['player'].isin(starters)

        return avg_positions

    def _parse_and_extract_jersey(self, df, player_name):
        """Helper to extract jersey for a player from full dataframe."""
        player_events = df[df['player'] == player_name]
        for _, event in player_events.iterrows():
            jersey = self._extract_jersey_number(event)
            if jersey != '?':
                return jersey
        return '?'

    def cluster_into_lines(self, players_df):
        """
        Group players into positional lines (Defense, Midfield, Attack).

        Args:
            players_df: DataFrame or list of player position dicts

        Returns:
            List of lines, where each line is a list of player dicts
        """
        # Convert to list of dicts if needed
        if isinstance(players_df, pd.DataFrame):
            players_list = players_df.to_dict('records')
        else:
            players_list = players_df

        if len(players_list) < 3:
            return []

        # Sort by x position (left to right)
        sorted_players = sorted(players_list, key=lambda p: p.get('avg_x', 0))

        # Skip goalkeeper (lowest x, typically)
        outfield = sorted_players[1:] if len(sorted_players) > 1 else []
        if len(outfield) < 2:
            return []

        # Calculate x gaps to detect line breaks
        x_values = [p.get('avg_x', 0) for p in outfield]
        gaps = [x_values[i + 1] - x_values[i] for i in range(len(x_values) - 1)]

        if not gaps:
            return []

        # Adaptive threshold based on 65th percentile of gaps
        gaps_sorted = sorted(gaps)
        threshold = gaps_sorted[max(0, int(len(gaps_sorted) * 0.65))]

        # Group into lines
        lines = []
        current_line = [outfield[0]]

        for i in range(1, len(outfield)):
            if outfield[i].get('avg_x', 0) - current_line[-1].get('avg_x', 0) > threshold:
                lines.append(current_line)
                current_line = [outfield[i]]
            else:
                current_line.append(outfield[i])

        lines.append(current_line)
        return lines

    def get_line_centroids(self, lines):
        """
        Calculate centroid for each line.

        Args:
            lines: List of lines, where each line is a list of player dicts

        Returns:
            List of (x, y) centroids
        """
        centroids = []
        for line in lines:
            if line:
                avg_x = sum(p.get('avg_x', 0) for p in line) / len(line)
                avg_y = sum(p.get('avg_y', 0) for p in line) / len(line)
                centroids.append((avg_x, avg_y))
        return centroids

    def draw_pitch_and_players(self, ax, team_data, team_name, color, show_connections=True):
        """
        Draw players on pitch with connecting lines.

        Args:
            ax: Matplotlib axis
            team_data: DataFrame or list of player dicts
            team_name: Team name for label
            color: Team color for visualization
            show_connections: Whether to draw connecting lines
        """
        # Draw pitch using mplsoccer
        pitch = Pitch(
            pitch_type='custom',
            pitch_length=105, pitch_width=68,
            pitch_color=self.colors['pitch'],
            line_color=self.colors['line'],
            linewidth=2,
            line_zorder=1,
            stripe=False
        )
        pitch.draw(ax=ax)

        # Convert to list of dicts if DataFrame
        if isinstance(team_data, pd.DataFrame):
            team_data = team_data.to_dict('records')
        team_data = [p.copy() for p in team_data]

        # Scale coordinates
        for p in team_data:
            p['x_scaled'] = p.get('avg_x', 0) * 1.05
            p['y_scaled'] = p.get('avg_y', 0) * 0.68

        # Cluster into lines and draw connections
        if show_connections and len(team_data) >= 4:
            lines = self.cluster_into_lines(team_data)
            centroids = self.get_line_centroids(lines)

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
                    for i, p1 in enumerate(line):
                        for j, p2 in enumerate(line):
                            if i < j:
                                ax.plot(
                                    [p1['x_scaled'], p2['x_scaled']],
                                    [p1['y_scaled'], p2['y_scaled']],
                                    color=color,
                                    alpha=0.12,
                                    linewidth=1.5,
                                    zorder=2
                                )

        # Draw player nodes
        for player in team_data:
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
            jersey = str(player.get('jersey', '?'))
            ax.text(
                x, y,
                jersey,
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

    def plot_dynamic_shape(self, df, team_name, output_path=None):
        """
        Create side-by-side comparison: Starting XI vs Post-Substitution formations.

        Args:
            df: Cleaned match DataFrame
            team_name: Team to visualize
            output_path: Path to save figure (optional)

        Returns:
            matplotlib figure object
        """
        # Clean data
        df = self.clean_match_data(df)

        # Extract substitutions
        substitutions = self.extract_substitutions(df)

        # Get all teams in match
        teams = sorted(df['team'].dropna().unique())
        if len(teams) < 2:
            raise ValueError(f"Expected 2 teams, found {len(teams)}")

        # Validate team selection
        if team_name not in teams:
            raise ValueError(f"Team '{team_name}' not in match. Available: {teams}")

        opponent = [t for t in teams if t != team_name][0]

        # Calculate Starting XI positions
        starting_positions = self.calculate_average_positions(df)

        team_starters = starting_positions[
            starting_positions['team'] == team_name
        ].nlargest(11, 'touches_count')

        opponent_starters = starting_positions[
            starting_positions['team'] == opponent
        ].nlargest(11, 'touches_count')

        # Find first substitution after 30 minutes for main team
        main_sub = None
        for sub in substitutions:
            if sub['team'] == team_name and sub['minute'] >= 30:
                main_sub = sub
                break

        if main_sub is None and substitutions:
            for sub in substitutions:
                if sub['team'] == team_name:
                    main_sub = sub
                    break

        # Create figure
        if main_sub:
            fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(20, 10))
            fig.patch.set_facecolor(self.colors['bg'])

            # LEFT: Starting XI
            self.draw_pitch_and_players(ax1, team_starters, f"{team_name} (Starting XI)",
                                       self.colors['team_a'])
            self.draw_pitch_and_players(ax1, opponent_starters, f"{opponent} (Starting XI)",
                                       self.colors['team_b'])

            ax1.text(
                52.5, -5,
                "STARTING FORMATION",
                ha='center', va='top',
                fontsize=11,
                fontweight='bold',
                color=self.colors['text'],
                alpha=0.6
            )

            # RIGHT: Post-Substitution
            post_sub_positions = self.calculate_average_positions(
                df[df['minute'] >= main_sub['minute']],
                excluded_players=[main_sub['off']]
            )

            team_post = post_sub_positions[
                post_sub_positions['team'] == team_name
            ].nlargest(11, 'touches_count')

            opponent_post = opponent_starters  # Opponent unchanged

            self.draw_pitch_and_players(ax2, team_post, f"{team_name} (Post-Sub)",
                                       self.colors['team_a'])
            self.draw_pitch_and_players(ax2, opponent_post, f"{opponent}",
                                       self.colors['team_b'])

            ax2.text(
                52.5, -5,
                f"AFTER {main_sub['minute']}' SUB\n{main_sub['off']} → {main_sub['on']}",
                ha='center', va='top',
                fontsize=11,
                fontweight='bold',
                color=self.colors['text'],
                alpha=0.6
            )
        else:
            # No subs - just show starting XI
            fig, ax1 = plt.subplots(1, 1, figsize=(12, 10))
            fig.patch.set_facecolor(self.colors['bg'])

            self.draw_pitch_and_players(ax1, team_starters, team_name,
                                       self.colors['team_a'])
            self.draw_pitch_and_players(ax1, opponent_starters, opponent,
                                       self.colors['team_b'])

            ax1.text(
                52.5, -5,
                "AVERAGE FORMATION & SHAPE",
                ha='center', va='top',
                fontsize=11,
                fontweight='bold',
                color=self.colors['text'],
                alpha=0.6
            )

        plt.tight_layout()

        if output_path:
            plt.savefig(output_path, dpi=300, bbox_inches='tight',
                       facecolor=self.colors['bg'])
            print(f"✓ Saved: {output_path}")

        return fig
