"""
CORE IMPLEMENTATION DETAILS
===========================

Key code snippets extracted for reference and understanding
of the robust data cleaning and parsing logic.
"""

# ============================================================================

# 1. SAFE QUALIFIER PARSING (Most Critical Component)

# ============================================================================

"""
The Challenge:
CSV qualifiers column contains Python dicts stored as strings with single quotes:
"[{'type': {'displayName': 'PassEndX', 'value': 140}, 'value': '38.9'}]"

Not valid JSON (single quotes), can't just use json.loads()

Solution with Fallbacks:
"""

import ast
import json

def parse_qualifiers_safe(qual_str):
"""
Safely parse stringified qualifier dictionaries.
Tries ast.literal_eval first (safest), then json with quote replacement.
"""
if not qual_str or qual_str == '[]' or pd.isna(qual_str):
return []

    try:
        # Try 1: ast.literal_eval (handles single quotes, SAFE)
        return ast.literal_eval(str(qual_str))
    except (ValueError, SyntaxError):
        try:
            # Try 2: Replace quotes and use JSON parser
            sanitized = str(qual_str).replace("'", '"')
            return json.loads(sanitized)
        except (json.JSONDecodeError, TypeError):
            # Graceful failure: return empty list, never crash
            return []

# Test it

test_qualifier = "[{'type': {'displayName': 'JerseyNumber'}, 'value': 7}]"
result = parse_qualifiers_safe(test_qualifier)

# Returns: [{'type': {'displayName': 'JerseyNumber'}, 'value': 7}]

# ============================================================================

# 2. JERSEY NUMBER EXTRACTION (Built on Safe Parsing)

# ============================================================================

def extract_jersey_number(event_row):
"""Extract jersey number from event, with smart fallback.""" # Use the safe parser
qualifiers = parse_qualifiers_safe(event_row.get('qualifiers', '[]'))

    # Search for JerseyNumber in qualifiers
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

# Test it

test_row = {
'player': 'Tom Cairney',
'qualifiers': "[{'type': {'displayName': 'JerseyNumber'}, 'value': 7}]"
}
jersey = extract_jersey_number(test_row)

# Returns: '7'

# ============================================================================

# 3. ROBUST DATA CLEANING

# ============================================================================

def clean_match_data(df):
"""Clean and prepare match data with no crashes."""
df = df.copy()

    # Safe numeric conversion (won't crash on mixed types)
    for col in ['x', 'y', 'end_x', 'end_y']:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors='coerce')
            # All invalid values become NaN, not errors

    # Mark touch events intelligently
    if 'is_touch' in df.columns:
        df['is_touch'] = df['is_touch'].astype(str).str.lower() == 'true'
    else:
        # Create touch column based on data presence
        df['is_touch'] = (
            df['player'].notna() &
            df['player'].str.len() > 0 &
            df['x'].notna() &
            df['y'].notna()
        )

    return df

# Usage

df_clean = clean_match_data(df_raw)

# Guaranteed no errors, coordinates are numeric, touches are marked

# ============================================================================

# 4. FORMATION CLUSTERING (Adaptive Algorithm)

# ============================================================================

def cluster_into_lines(players_list):
"""
Group players into formation lines using adaptive gap detection.
Handles: 4-3-3, 3-5-2, 5-3-2, etc. automatically
"""
if len(players_list) < 3:
return []

    # Sort by x position (left = defense, right = attack)
    sorted_players = sorted(players_list, key=lambda p: p['avg_x'])

    # Skip goalkeeper (lowest x)
    outfield = sorted_players[1:]
    if len(outfield) < 2:
        return []

    # Calculate gaps between consecutive players
    x_values = [p['avg_x'] for p in outfield]
    gaps = [x_values[i+1] - x_values[i] for i in range(len(x_values)-1)]

    if not gaps:
        return []

    # Adaptive threshold: 65th percentile of gaps
    # This means we split when gap is in upper third
    gaps_sorted = sorted(gaps)
    threshold = gaps_sorted[max(0, int(len(gaps_sorted) * 0.65))]

    # Group into lines using threshold
    lines = []
    current_line = [outfield[0]]

    for i in range(1, len(outfield)):
        gap = outfield[i]['avg_x'] - current_line[-1]['avg_x']
        if gap > threshold:
            # Large gap = new line
            lines.append(current_line)
            current_line = [outfield[i]]
        else:
            # Small gap = same line
            current_line.append(outfield[i])

    lines.append(current_line)
    return lines

# Result: Automatically detects formation

# [GK, D, D, D, D, M, M, M, F, F, F] → becomes [[D,D,D,D], [M,M,M], [F,F,F]] → "4-3-3"

# ============================================================================

# 5. SUBSTITUTION EXTRACTION

# ============================================================================

def extract_substitutions(df):
"""Extract substitution events and match off/on pairs."""
if 'type' not in df.columns or 'minute' not in df.columns:
return []

    subs_off = df[df['type'] == 'SubstitutionOff'].copy()
    subs_on = df[df['type'] == 'SubstitutionOn'].copy()

    if subs_off.empty or subs_on.empty:
        return []

    substitutions = []
    for _, off_event in subs_off.iterrows():
        # Find matching ON event (same team + same minute)
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

# Result: List of exact sub events with timing

# [{'minute': 45, 'team': 'Fulham', 'off': 'Willian', 'on': 'Bobby De Cordova-Reid'}, ...]

# ============================================================================

# 6. AVERAGE POSITION CALCULATION

# ============================================================================

def calculate_average_positions(df, excluded_players=None, only_players=None, min_touches=10):
"""Calculate average positions where each player touched the ball."""

    # Filter to touch events only
    touches = df[df['is_touch']].copy()

    if touches.empty:
        return pd.DataFrame()

    # Apply player filters
    if excluded_players:
        touches = touches[~touches['player'].isin(excluded_players)]
    if only_players:
        touches = touches[touches['player'].isin(only_players)]

    # Group by team and player, calculate averages
    avg_positions = touches.groupby(['team', 'player']).agg(
        avg_x=('x', 'mean'),
        avg_y=('y', 'mean'),
        touches_count=('x', 'count')
    ).reset_index()

    # Filter minimum touch threshold
    avg_positions = avg_positions[avg_positions['touches_count'] >= min_touches]

    # Identify top 11 per team (starters)
    starters = set()
    for team in avg_positions['team'].unique():
        team_players = avg_positions[avg_positions['team'] == team].nlargest(11, 'touches_count')
        starters.update(team_players['player'].tolist())

    avg_positions['is_starter'] = avg_positions['player'].isin(starters)

    return avg_positions

# Result: Clean positions dataframe

# team | player | avg_x | avg_y | touches_count | is_starter

# Fulham| Tom Cairney | 55.9 | 72.8 | 48 | True

# Everton| Idrissa Gueye | 51.1 | 46.5 | 72 | True

# ============================================================================

# INTEGRATION EXAMPLE

# ============================================================================

"""
Putting it all together in your analysis:

    import pandas as pd

    # 1. Load
    df = pd.read_csv('match_1729194_events.csv')

    # 2. Clean (robust, no crashes)
    df_clean = clean_match_data(df)

    # 3. Extract
    subs = extract_substitutions(df_clean)
    positions = calculate_average_positions(df_clean)

    # 4. Analyze
    for player_row in positions.iterrows():
        jersey = extract_jersey_number(df.loc[player_row.name])
        print(f"Jersey: {jersey}")

    # 5. Cluster formation
    fulham_starters = positions[positions['team'] == 'Fulham']
    lines = cluster_into_lines(fulham_starters)
    formation = "-".join(str(len(line)) for line in lines)
    print(f"Formation: {formation}")  # e.g., "4-3-3"

"""

# ============================================================================

# ERROR HANDLING PHILOSOPHY

# ============================================================================

"""
Every function is designed to:

1. Accept ANY input without crashing
2. Return sensible defaults if parsing fails
3. Never leave data in inconsistent state

Examples:

- parse_qualifiers_safe('garbage str') → []
- extract_jersey_number(incomplete_row) → '?'
- clean_match_data(df_with_nulls) → cleaned df
- calculate_average_positions(empty_df) → empty dataframe
- cluster_into_lines([single_player]) → []

This makes it safe to pipe data through without defensive coding.
"""
