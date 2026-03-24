"""
Standalone execution script for enhanced formation visualization.
Load, clean, and visualize match data with formation analysis.
"""

import sys
from pathlib import Path

# Add project root to path
project_root = Path(__file__).resolve().parent
sys.path.insert(0, str(project_root))

import pandas as pd
from xAssassin.formation_analyzer import FormationAnalyzer


def main():
    """Load, clean, and visualize match data."""

    # ========== Configuration ==========
    MATCH_ID = 1729194
    DATA_PATH = project_root / "data" / "raw_event" / f"match_{MATCH_ID}_events.csv"

    # Team to analyze (choose from: 'Fulham', 'Everton')
    TEAM_TO_ANALYZE = 'Fulham'

    OUTPUT_DIR = project_root / "output" / "formations"
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    print(f"\n{'=' * 70}")
    print(f"Enhanced Formation Analysis")
    print(f"{'=' * 70}")
    print(f"\nMatch ID: {MATCH_ID}")
    print(f"Team: {TEAM_TO_ANALYZE}")
    print(f"Data Path: {DATA_PATH}")

    # ========== Load Raw Data ==========
    print(f"\n[1/5] Loading raw data...")
    if not DATA_PATH.exists():
        print(f"❌ Error: File not found at {DATA_PATH}")
        return False

    try:
        df = pd.read_csv(DATA_PATH)
        print(f"✓ Loaded {len(df):,} events")
    except Exception as e:
        print(f"❌ Error loading CSV: {e}")
        return False

    # ========== Initialize Analyzer ==========
    print(f"\n[2/5] Initializing analyzer...")
    analyzer = FormationAnalyzer(dark_mode=True, min_touches=10)
    print(f"✓ Analyzer ready")

    # ========== Clean Data ==========
    print(f"\n[3/5] Cleaning data...")
    try:
        df_clean = analyzer.clean_match_data(df)
        print(f"✓ Data cleaned")
        print(f"  - Total rows: {len(df_clean):,}")
        print(f"  - Touch events: {df_clean['is_touch'].sum():,}")
        print(f"  - Teams: {sorted(df_clean['team'].dropna().unique())}")
    except Exception as e:
        print(f"❌ Error during cleaning: {e}")
        return False

    # ========== Extract Substitutions ==========
    print(f"\n[4/5] Extracting substitutions...")
    try:
        substitutions = analyzer.extract_substitutions(df_clean)
        if substitutions:
            print(f"✓ Found {len(substitutions)} substitutions:")
            for sub in substitutions:
                print(f"  {sub['minute']}' | {sub['team']}: {sub['off']} → {sub['on']}")
        else:
            print(f"✓ No substitutions found")
    except Exception as e:
        print(f"❌ Error extracting substitutions: {e}")
        return False

    # ========== Generate Visualization ==========
    print(f"\n[5/5] Generating formation visualization...")
    try:
        output_file = OUTPUT_DIR / f"{TEAM_TO_ANALYZE.lower()}_formation_{MATCH_ID}.png"
        fig = analyzer.plot_dynamic_shape(df_clean, TEAM_TO_ANALYZE, output_path=str(output_file))
        print(f"✓ Visualization complete")
        print(f"  - Saved to: {output_file}")
    except Exception as e:
        print(f"❌ Error generating visualization: {e}")
        import traceback
        traceback.print_exc()
        return False

    # ========== Summary ==========
    print(f"\n{'=' * 70}")
    print(f"✓ Analysis Complete!")
    print(f"{'=' * 70}\n")
    return True


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
