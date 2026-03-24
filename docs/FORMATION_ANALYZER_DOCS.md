"""
FORMATION ANALYZER DOCUMENTATION
================================

Complete guide to the enhanced formation visualization system
that safely parses stringified qualifiers and generates
SofaScore-style formation diagrams with jersey numbers.
"""

# ============================================================================

# TABLE OF CONTENTS

# ============================================================================

"""

1. OVERVIEW
2. INSTALLATION & DEPENDENCIES
3. QUICK START
4. ROBUST DATA CLEANING
5. API REFERENCE
6. USAGE PATTERNS
7. ADVANCED FEATURES
8. TROUBLESHOOTING
   """

# ============================================================================

# 1. OVERVIEW

# ============================================================================

"""
The FormationAnalyzer is a production-ready class for:

✓ SAFE QUALIFIER PARSING

- Handles single-quoted Python dicts in strings (not valid JSON)
- Safely extracts jersey numbers using ast.literal_eval with fallback
- Gracefully handles missing/malformed data

✓ ROBUST DATA CLEANING

- Converts mixed-type columns to numeric safely
- Detects and marks "touch" events intelligently
- Handles missing values without errors

✓ FORMATION ANALYSIS

- Clusters players into positional lines (Defense, Midfield, Attack)
- Calculates formation (e.g., "4-3-3", "3-5-2")
- Extracts substitution events automatically

✓ VISUALIZATION

- Side-by-side starting XI vs post-substitution formations
- Player connection lines showing team structure
- Jersey numbers on each player node
- Glow effects for visual depth
- Both dark and light theme support
- SofaScore-style aesthetics
  """

# ============================================================================

# 2. INSTALLATION & DEPENDENCIES

# ============================================================================

"""
Required packages:
pip install pandas numpy matplotlib mplsoccer

Optional (for enhanced features):
pip install scikit-learn scipy

File structure:
SoccerStats/
├── xAssassin/
│ └── formation_analyzer.py # Main class
├── data/
│ └── raw_event/
│ └── match_1729194_events.csv
├── run_formation_analysis.py # Standalone execution
└── formation_examples.py # 7 usage examples
"""

# ============================================================================

# 3. QUICK START

# ============================================================================

"""
Minimal 5-line example:

    import pandas as pd
    from xAssassin.formation_analyzer import FormationAnalyzer

    df = pd.read_csv('match_1729194_events.csv')
    analyzer = FormationAnalyzer()
    analyzer.plot_dynamic_shape(df, 'Fulham', output_path='fulham.png')

That's it! You get:

- Automatically cleaned data
- Jersey numbers extracted from qualifiers
- Pre-sub vs post-sub comparison
- Formation lines and connections
- Beautiful SofaScore-style visualization
  """

# ============================================================================

# 4. ROBUST DATA CLEANING

# ============================================================================

"""
The class robustly handles the trickiest part: qualifier parsing.

PROBLEM: CSV has a qualifiers column with Python dicts stored as strings:
"[{'type': {'displayName': 'JerseyNumber', 'value': 140}, 'value': '7'}]"

SOLUTION: Safe parsing with fallbacks 1. Try ast.literal_eval (safest, handles single quotes) 2. Fallback to JSON after sanitizing quotes 3. Return empty list if both fail (no crash)

Example:
qualifiers = analyzer.\_parse_qualifiers_safe(any_string) # Always returns a list, never throws

This handles:
✓ Single-quoted dicts: {'type': {'displayName': 'X'}}
✓ Mixed quotes
✓ Empty/null values
✓ Malformed JSON
✓ Missing qualifiers column
"""

# ============================================================================

# 5. API REFERENCE

# ============================================================================

"""
FormationAnalyzer(dark_mode=True, min_touches=10)
Initialize analyzer with theme and touch threshold.

analyzer.clean_match_data(df)
Returns: Cleaned DataFrame with proper types and no critical missing values

analyzer.calculate_average_positions(df, excluded_players=None, only_players=None)
Returns: DataFrame with columns - team, player, avg_x, avg_y, touches_count, jersey, is_starter

analyzer.extract_substitutions(df)
Returns: List[Dict] with {minute, team, off, on}

analyzer.cluster_into_lines(players_df)
Returns: List[List[Dict]] — players grouped into formation lines

analyzer.get_line_centroids(lines)
Returns: List[Tuple(x, y)] — center point of each line

analyzer.plot_dynamic_shape(df, team_name, output_path=None)
Returns: matplotlib Figure
Side-by-side comparison of formations before/after substitutions
"""

# ============================================================================

# 6. USAGE PATTERNS

# ============================================================================

"""
PATTERN 1: Single Team Visualization
analyzer = FormationAnalyzer()
analyzer.plot_dynamic_shape(df, 'Fulham', output_path='fulham.png')

PATTERN 2: Inspect Player Data
positions = analyzer.calculate_average_positions(df)
print(positions[['player', 'touches_count', 'avg_x', 'avg_y']])

PATTERN 3: Get Substitution Timeline
subs = analyzer.extract_substitutions(df)
for sub in subs:
print(f"{sub['minute']}' {sub['team']}: {sub['off']} → {sub['on']}")

PATTERN 4: Formation Detection
lines = analyzer.cluster_into_lines(players)
formation_shape = "-".join(str(len(line)) for line in lines) # Example: "4-3-3"

PATTERN 5: Batch Processing
match*ids = [1729194, 1729195, 1729196]
for m_id in match_ids:
df = pd.read_csv(f'match*{m*id}\_events.csv')
analyzer.plot_dynamic_shape(df, 'Fulham', f'fulham*{m_id}.png')

PATTERN 6: Stats before/after substitution
df_pre = df[df['minute'] < sub['minute']]
df_post = df[df['minute'] >= sub['minute']]
pre_positions = analyzer.calculate_average_positions(df_pre)
post_positions = analyzer.calculate_average_positions(df_post) # Compare formations
"""

# ============================================================================

# 7. ADVANCED FEATURES

# ============================================================================

"""
Light Mode Theme:
analyzer = FormationAnalyzer(dark_mode=False) # Uses cream/beige pitch, dark text, different colors

Custom Touch Threshold:
analyzer = FormationAnalyzer(min_touches=5) # Include all players with 5+ touches (default is 10)

Access Cleaned Data Only:
df_clean = analyzer.clean_match_data(df) # No visualization, just data preparation

Extract Jersey Numbers Independent of Visualization:
for idx, row in df.iterrows():
jersey = analyzer.\_extract_jersey_number(row)

Get Formation Diagnosis:
lines = analyzer.cluster_into_lines(players)
centroids = analyzer.get_line_centroids(lines) # Use for pitch mapping, heat mapping, etc.
"""

# ============================================================================

# 8. TROUBLESHOOTING

# ============================================================================

"""
Q: "File not found error"
A: Check your working directory. Use absolute paths if needed:
from pathlib import Path
df = pd.read_csv(Path.cwd() / 'data' / 'match_1729194_events.csv')

Q: "Jersey numbers showing as '?'"
A: Qualifiers might not contain jersey info. Check your data:
df[df['player'] == 'Tom Cairney']['qualifiers'].iloc[0]
The parser tries: qualifiers → JerseyNumber → last name initial

Q: "Formation shows too many lines (5+)"
A: Threshold is adaptive but can be customized. Try:
df_clean = analyzer.clean_match_data(df)
lines = analyzer.cluster_into_lines(key_players) # Pre-filter to 11

Q: "Low number of players detected"
A: Might have high min_touches threshold. Try:
analyzer = FormationAnalyzer(min_touches=5)

Q: "Memory error on large CSV"
A: Process matches in chunks:
chunks = pd.read_csv('match_large.csv', chunksize=1000)
for chunk in chunks:
analyzer.clean_match_data(chunk)

Q: "Colors look wrong"
A: Verify dark_mode setting:
analyzer = FormationAnalyzer(dark_mode=True) # Default

# If output looks inverted, try dark_mode=False

"""

# ============================================================================

# EXECUTION EXAMPLES

# ============================================================================

"""
Example 1: Standalone Script
cd SoccerStats
python3 run_formation_analysis.py # Generates: output/formations/fulham_formation_1729194.png

Example 2: Run Examples
python3 formation_examples.py 1 # Basic analysis
python3 formation_examples.py 2 # Inspect data
python3 formation_examples.py 3 # Custom filtering
python3 formation_examples.py 6 # Full workflow
python3 formation_examples.py 7 # Jersey extraction

Example 3: In Python Script
from pathlib import Path
import pandas as pd
from xAssassin.formation_analyzer import FormationAnalyzer

    # Load
    df = pd.read_csv('match_1729194_events.csv')

    # Analyze
    analyzer = FormationAnalyzer(dark_mode=True, min_touches=10)

    # Inspect
    positions = analyzer.calculate_average_positions(analyzer.clean_match_data(df))
    print(positions)

    # Visualize
    analyzer.plot_dynamic_shape(df, 'Fulham', 'output.png')

Example 4: In Jupyter Notebook
import pandas as pd
from xAssassin.formation_analyzer import FormationAnalyzer

    df = pd.read_csv('match_1729194_events.csv')
    analyzer = FormationAnalyzer()

    fig = analyzer.plot_dynamic_shape(df, 'Fulham')
    fig.show()  # Display inline

"""

# ============================================================================

# KEY FEATURES EXPLAINED

# ============================================================================

"""

1. SAFE QUALIFIER PARSING
   Problem: CSV qualifiers are Python dicts with single quotes
   Solution: ast.literal_eval (safe) → fallback json.loads
   Benefit: No crashes, handles all edge cases gracefully

2. JERSEY NUMBER EXTRACTION
   Process:
   a) Parse qualifiers safely
   b) Look for type.displayName == 'JerseyNumber'
   c) Extract value field
   d) Fallback to player's last name initial
   Result: Every player has a visible identifier

3. FORMATION CLUSTERING
   Algorithm:
   a) Sort players by x-position
   b) Calculate gaps between adjacent players
   c) Find 65th percentile gap as threshold
   d) Group players where gap < threshold
   Result: Automatically detects formation lines (4-3-3, 3-5-2, etc.)

4. SUBSTITUTION DETECTION
   Process:
   a) Find SubstitutionOff events
   b) Match with SubstitutionOn events (same team, same minute)
   c) Create off/on pairs
   Result: Can show pre-sub and post-sub formations

5. VISUAL EFFECTS
   - Glow effect: Outer circle with low alpha behind main circle
   - Jersey numbers: Centered in player circles
   - Connection lines: Dashed for inter-line, solid for intra-line
   - Color coding: Team colors (red/cyan by default)
   - Theme support: Dark or light background
     """

# ============================================================================

# SUMMARY

# ============================================================================

"""
The FormationAnalyzer provides production-ready formation analysis:

✓ Ingests raw event CSVs with complex qualifier data
✓ Safely parses Python dict strings without crashes
✓ Determines formation from player positions
✓ Shows before/after substitution impact
✓ Generates publication-quality visualizations
✓ Provides clean data access for custom analysis

All with a simple 3-line interface:
analyzer = FormationAnalyzer()
df = pd.read_csv('match_data.csv')
analyzer.plot_dynamic_shape(df, 'Team_Name', 'output.png')
"""
