"""
FormationAnalyzer Usage Guide and Examples
==========================================

Complete documentation with multiple usage patterns.
"""

import pandas as pd
from pathlib import Path
from xAssassin.formation_analyzer import FormationAnalyzer


# ============================================================================
# EXAMPLE 1: Simple Single-Team Analysis (Quickest Way)
# ============================================================================
def example_basic_analysis():
    """Minimal example: Load, visualize, done."""
    print("\n" + "=" * 70)
    print("EXAMPLE 1: Basic Team Analysis")
    print("=" * 70)

    # Load and visualize
    df = pd.read_csv(Path(__file__).parent / "data/raw_event/match_1729194_events.csv")
    analyzer = FormationAnalyzer(dark_mode=True)
    analyzer.plot_dynamic_shape(
        df,
        team_name='Fulham',
        output_path='output/formations/example_fulham.png'
    )
    print("✓ Generated: example_fulham.png")


# ============================================================================
# EXAMPLE 2: Access Cleaned Data and Statistics
# ============================================================================
def example_inspect_data():
    """Get detailed statistics on players and events."""
    print("\n" + "=" * 70)
    print("EXAMPLE 2: Data Inspection & Statistics")
    print("=" * 70)

    # Load and clean
    df = pd.read_csv(Path(__file__).parent / "data/raw_event/match_1729194_events.csv")
    analyzer = FormationAnalyzer(min_touches=5)  # Lower threshold for more players
    df_clean = analyzer.clean_match_data(df)

    # Get average positions
    positions = analyzer.calculate_average_positions(df_clean)

    print(f"\nFulham players with 5+ touches:")
    fulham = positions[positions['team'] == 'Fulham'].sort_values('touches_count', ascending=False)
    for idx, row in fulham.head(11).iterrows():
        print(f"  #{row['jersey']:>2} | {row['player']:<20} | {row['touches_count']:>3} touches | pos: ({row['avg_x']:.1f}, {row['avg_y']:.1f})")

    print(f"\nEverton players with 5+ touches:")
    everton = positions[positions['team'] == 'Everton'].sort_values('touches_count', ascending=False)
    for idx, row in everton.head(11).iterrows():
        print(f"  #{row['jersey']:>2} | {row['player']:<20} | {row['touches_count']:>3} touches | pos: ({row['avg_x']:.1f}, {row['avg_y']:.1f})")

    # Substitutions
    subs = analyzer.extract_substitutions(df_clean)
    print(f"\nSubstitutions ({len(subs)} total):")
    for sub in subs:
        print(f"  {sub['minute']:>2}' | {sub['team']:<8} | {sub['off']:<20} → {sub['on']:<20}")


# ============================================================================
# EXAMPLE 3: Custom Filtering and Analysis
# ============================================================================
def example_custom_analysis():
    """Analyze specific subsets of players."""
    print("\n" + "=" * 70)
    print("EXAMPLE 3: Custom Player Filtering")
    print("=" * 70)

    df = pd.read_csv(Path(__file__).parent / "data/raw_event/match_1729194_events.csv")
    analyzer = FormationAnalyzer()
    df_clean = analyzer.clean_match_data(df)

    # Get positions for ONLY Fulham's starting XI
    positions = analyzer.calculate_average_positions(df_clean)
    fulham_starters = positions[
        (positions['team'] == 'Fulham') &
        (positions['is_starter'])
    ].sort_values('touches_count', ascending=False)

    print(f"\nFulham Starting XI formation analysis:")
    print(f"Total starters: {len(fulham_starters)}")

    # Cluster into formation lines
    lines = analyzer.cluster_into_lines(fulham_starters)
    print(f"Formation lines detected: {len(lines)}")

    for i, line in enumerate(lines, 1):
        print(f"  Line {i}: {len(line)} players")
        for player in line:
            print(f"    - {player['player']} (x={player['avg_x']:.1f})")


# ============================================================================
# EXAMPLE 4: Batch Processing Multiple Matches
# ============================================================================
def example_batch_processing():
    """Process multiple matches in sequence."""
    print("\n" + "=" * 70)
    print("EXAMPLE 4: Batch Processing Multiple Matches")
    print("=" * 70)

    match_ids = [1729194, 1729195, 1729196]
    team_name = 'Fulham'

    analyzer = FormationAnalyzer()
    output_dir = Path('output/formations/batch')
    output_dir.mkdir(parents=True, exist_ok=True)

    for match_id in match_ids:
        csv_path = Path(__file__).parent / f"data/raw_event/match_{match_id}_events.csv"

        if not csv_path.exists():
            print(f"⚠ Skipping {match_id}: File not found")
            continue

        try:
            df = pd.read_csv(csv_path)
            output_file = output_dir / f"{team_name.lower()}_{match_id}.png"
            analyzer.plot_dynamic_shape(df, team_name, output_path=str(output_file))
            print(f"✓ Match {match_id}: {output_file.name}")
        except Exception as e:
            print(f"✗ Match {match_id}: {e}")


# ============================================================================
# EXAMPLE 5: Light Mode Visualization
# ============================================================================
def example_light_mode():
    """Generate visualization with light theme."""
    print("\n" + "=" * 70)
    print("EXAMPLE 5: Light Mode Theme")
    print("=" * 70)

    df = pd.read_csv(Path(__file__).parent / "data/raw_event/match_1729194_events.csv")
    analyzer = FormationAnalyzer(dark_mode=False)  # Light mode
    analyzer.plot_dynamic_shape(df, 'Fulham', output_path='output/formations/example_light.png')
    print("✓ Generated light mode visualization: example_light.png")


# ============================================================================
# EXAMPLE 6: Direct Data Processing Workflow
# ============================================================================
def example_full_workflow():
    """Complete workflow with all steps visible."""
    print("\n" + "=" * 70)
    print("EXAMPLE 6: Full Workflow - Step by Step")
    print("=" * 70)

    # Step 1: Load CSV
    print("\n[1] Loading CSV...")
    csv_path = Path(__file__).parent / "data/raw_event/match_1729194_events.csv"
    df = pd.read_csv(csv_path)
    print(f"    Loaded {len(df)} rows")

    # Step 2: Initialize analyzer
    print("\n[2] Initializing analyzer...")
    analyzer = FormationAnalyzer(dark_mode=True, min_touches=10)
    print(f"    Config: dark_mode=True, min_touches=10")

    # Step 3: Clean data
    print("\n[3] Cleaning data...")
    df_clean = analyzer.clean_match_data(df)
    print(f"    Cleaned {len(df_clean)} events")
    print(f"    - Touches: {df_clean['is_touch'].sum()}")
    print(f"    - Teams: {sorted(df_clean['team'].dropna().unique())}")

    # Step 4: Extract substitutions
    print("\n[4] Extracting substitutions...")
    subs = analyzer.extract_substitutions(df_clean)
    print(f"    Found {len(subs)} subs:")
    for sub in subs[:3]:
        print(f"      {sub['minute']}' | {sub['team']}: {sub['off']} → {sub['on']}")

    # Step 5: Analyze positions
    print("\n[5] Analyzing positions...")
    positions = analyzer.calculate_average_positions(df_clean)
    print(f"    {len(positions)} players with 10+ touches")

    fulham_avg = positions[positions['team'] == 'Fulham']['avg_x'].mean()
    everton_avg = positions[positions['team'] == 'Everton']['avg_x'].mean()
    print(f"    - Fulham avg x position: {fulham_avg:.1f}")
    print(f"    - Everton avg x position: {everton_avg:.1f}")

    # Step 6: Generate visualization
    print("\n[6] Generating visualization...")
    analyzer.plot_dynamic_shape(df_clean, 'Fulham', output_path='output/formations/workflow_example.png')
    print(f"    Saved to: output/formations/workflow_example.png")

    print("\n✓ Workflow complete!\n")


# ============================================================================
# EXAMPLE 7: Custom Jersey Number Processing
# ============================================================================
def example_jersey_extraction():
    """Demonstrate jersey number extraction from qualifiers."""
    print("\n" + "=" * 70)
    print("EXAMPLE 7: Jersey Number Extraction")
    print("=" * 70)

    df = pd.read_csv(Path(__file__).parent / "data/raw_event/match_1729194_events.csv")
    analyzer = FormationAnalyzer()

    # Parse qualifiers and extract jerseys
    print("\nJersey number extraction examples:")
    print("(Shows how qualifiers are safely parsed from stringified dicts)\n")

    for idx, row in df[df['player'].notna()].head(5).iterrows():
        if row['player']:
            jersey = analyzer._extract_jersey_number(row)
            qualifiers = analyzer._parse_qualifiers_safe(row.get('qualifiers', '[]'))
            print(f"  Player: {row['player']:<20} | Jersey: {jersey:>3} | Qualifiers: {len(qualifiers)} items")


# ============================================================================
# MAIN: Run all examples or specific one
# ============================================================================
def main():
    """Run selected examples."""
    import sys

    examples = {
        '1': ('Basic Analysis', example_basic_analysis),
        '2': ('Inspect Data', example_inspect_data),
        '3': ('Custom Filtering', example_custom_analysis),
        '4': ('Batch Processing', example_batch_processing),
        '5': ('Light Mode', example_light_mode),
        '6': ('Full Workflow', example_full_workflow),
        '7': ('Jersey Extraction', example_jersey_extraction),
    }

    if len(sys.argv) > 1 and sys.argv[1] in examples:
        example_num = sys.argv[1]
        name, func = examples[example_num]
        print(f"\n>>> Running: {name}")
        func()
    else:
        print("\n" + "=" * 70)
        print("FormationAnalyzer - Usage Examples")
        print("=" * 70)
        print("\nUsage: python formation_examples.py [example_number]")
        print("\nAvailable examples:")
        for num, (name, _) in examples.items():
            print(f"  {num}: {name}")
        print("\nExample: python formation_examples.py 1")
        print("=" * 70 + "\n")


if __name__ == "__main__":
    main()
