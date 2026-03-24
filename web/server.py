import os
import sys
import glob
import ast
import json
import pandas as pd
from flask import Flask, jsonify, send_from_directory, request
from flask_cors import CORS
from pathlib import Path

# Load environment variables
from dotenv import load_dotenv
load_dotenv(Path(__file__).parent.parent / ".env")

# Add project root so we can import xAssassin
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from xAssassin.metrices import TacticalEngine

app = Flask(__name__, static_folder="static", template_folder="templates")
CORS(app)

engine = TacticalEngine()
DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "raw_event")

# ---------- helpers ----------

_cache = {}


def _load_match(match_id):
    """Load a match CSV from disk, with simple caching."""
    if match_id in _cache:
        return _cache[match_id]

    patterns = [
        os.path.join(DATA_DIR, f"match_{match_id}_events.csv"),
        os.path.join(DATA_DIR, f"match_{match_id}_event.csv"),
    ]
    for p in patterns:
        if os.path.isfile(p):
            df = pd.read_csv(p)
            cols = ["game_id", "minute", "second", "team", "player",
                    "x", "y", "end_x", "end_y", "type", "outcome_type", "period", "is_touch"]
            df = df[[c for c in cols if c in df.columns]]
            _cache[match_id] = df
            return df
    return pd.DataFrame()


def _all_match_ids():
    files = glob.glob(os.path.join(DATA_DIR, "match_*_event*.csv"))
    ids = []
    for f in files:
        base = os.path.basename(f)
        mid = base.replace("match_", "").replace("_events.csv", "").replace("_event.csv", "")
        try:
            ids.append(int(mid))
        except ValueError:
            pass
    return sorted(ids)


def _get_season_map():
    """Build a mapping of match_id -> season label."""
    all_ids = sorted(_all_match_ids())
    SEASON_LABELS = ["2023/24", "2024/25", "2025/26"]
    cluster_idx = 0
    season_map = {}
    for i, mid in enumerate(all_ids):
        if i > 0 and (mid - all_ids[i - 1]) > 5000:
            cluster_idx = min(cluster_idx + 1, len(SEASON_LABELS) - 1)
        season_map[mid] = SEASON_LABELS[cluster_idx]
    return season_map


def _team_season_data(team_name, season=None):
    """Aggregate passes across all available matches for a given team, optionally filtered by season."""
    key = f"team_{team_name}_{season or 'all'}_passes"
    if key in _cache:
        return _cache[key]

    season_map = _get_season_map() if season else {}

    all_frames = []
    for mid in _all_match_ids():
        # Skip if season filter is set and doesn't match
        if season and season_map.get(mid) != season:
            continue
        df = _load_match(mid)
        if df.empty:
            continue
        team_df = df[(df["team"] == team_name) &
                     (df["type"] == "Pass") &
                     (df["outcome_type"].str.lower() == "successful")]
        if not team_df.empty:
            all_frames.append(team_df)

    result = pd.concat(all_frames, ignore_index=True) if all_frames else pd.DataFrame()
    _cache[key] = result
    return result


def _team_all_events(team_name, season=None):
    """Aggregate ALL events across all available matches for a given team, optionally filtered by season."""
    key = f"team_{team_name}_{season or 'all'}_events"
    if key in _cache:
        return _cache[key]

    season_map = _get_season_map() if season else {}

    all_frames = []
    for mid in _all_match_ids():
        if season and season_map.get(mid) != season:
            continue
        df = _load_match(mid)
        if df.empty:
            continue
        team_df = df[df["team"] == team_name]
        if not team_df.empty:
            all_frames.append(team_df)

    result = pd.concat(all_frames, ignore_index=True) if all_frames else pd.DataFrame()
    _cache[key] = result
    return result


# ---------- API routes ----------

@app.route("/api/matches")
def list_matches():
    return jsonify(_all_match_ids())


_match_index_cache = None


@app.route("/api/match-index")
def match_index():
    global _match_index_cache
    if _match_index_cache is not None:
        return jsonify(_match_index_cache)

    all_ids = sorted(_all_match_ids())

    # Detect season clusters: a gap > 5000 between consecutive IDs = new season
    SEASON_LABELS = ["2023/24", "2024/25", "2025/26"]
    cluster_idx = 0
    season_map = {}
    for i, mid in enumerate(all_ids):
        if i > 0 and (mid - all_ids[i - 1]) > 5000:
            cluster_idx = min(cluster_idx + 1, len(SEASON_LABELS) - 1)
        season_map[mid] = SEASON_LABELS[cluster_idx]

    result = []
    for mid in all_ids:
        home, away = None, None
        for pat in [f"match_{mid}_events.csv", f"match_{mid}_event.csv"]:
            p = os.path.join(DATA_DIR, pat)
            if os.path.isfile(p):
                try:
                    # Read just enough rows to identify both teams (home appears first)
                    peek = pd.read_csv(p, usecols=["team"], nrows=150)
                    teams = peek["team"].dropna().unique().tolist()
                    if len(teams) >= 2:
                        home, away = teams[0], teams[1]
                    elif len(teams) == 1:
                        home = teams[0]
                except Exception:
                    pass
                break

        if home and away:
            result.append({
                "id": mid,
                "home": home,
                "away": away,
                "season": season_map.get(mid, "Unknown"),
            })

    _match_index_cache = result
    return jsonify(result)


@app.route("/api/teams")
def list_teams():
    teams = set()
    # Sample a few matches to discover teams
    for mid in _all_match_ids()[:20]:
        df = _load_match(mid)
        if not df.empty:
            teams.update(df["team"].dropna().unique().tolist())
    return jsonify(sorted(teams))


@app.route("/api/match/<int:match_id>/events")
def match_events(match_id):
    df = _load_match(match_id)
    if df.empty:
        return jsonify([])
    return jsonify(df.fillna("").to_dict(orient="records"))


@app.route("/api/match/<int:match_id>/passes")
def match_passes(match_id):
    df = _load_match(match_id)
    if df.empty:
        return jsonify([])
    team = request.args.get("team")
    player = request.args.get("player")
    passes = df[(df["type"] == "Pass") &
                (df["outcome_type"].str.lower() == "successful")]
    if team:
        passes = passes[passes["team"] == team]
    if player:
        passes = passes[passes["player"] == player]
    return jsonify(passes.fillna("").to_dict(orient="records"))


@app.route("/api/match/<int:match_id>/sca")
def match_sca(match_id):
    df = _load_match(match_id)
    if df.empty:
        return jsonify([])
    team = request.args.get("team")
    sca = engine.calculate_sca(df)
    if team and not sca.empty:
        team_players = df[df["team"] == team]["player"].dropna().unique().tolist()
        sca = sca[sca["Player"].isin(team_players)]
    return jsonify(sca.to_dict(orient="records"))


@app.route("/api/match/<int:match_id>/sca_events")
def match_sca_events(match_id):
    """Return the raw SCA events with coordinates for pitch plotting."""
    df = _load_match(match_id)
    if df.empty:
        return jsonify([])

    team = request.args.get("team")
    player = request.args.get("player")

    sorted_df = df.sort_values(by=["minute", "second"]).reset_index(drop=True)
    shot_cond = sorted_df["type"].isin(["MissedShots", "SavedShots", "Goal"])
    shot_idxs = sorted_df[shot_cond].index

    events = []
    for idx in shot_idxs:
        shot_team = sorted_df.loc[idx, "team"]
        if team and shot_team != team:
            continue
        for offset in [1, 2]:
            if idx - offset >= 0:
                action = sorted_df.loc[idx - offset]
                if action["team"] == shot_team:
                    row = action.to_dict()
                    if player and row.get("player") != player:
                        continue
                    events.append(row)

    return jsonify(pd.DataFrame(events).fillna("").to_dict(orient="records") if events else [])


@app.route("/api/match/<int:match_id>/xt")
def match_xt(match_id):
    df = _load_match(match_id)
    if df.empty:
        return jsonify([])
    team = request.args.get("team")
    if team:
        df = df[df["team"] == team]
    xt = engine.calculate_xt(df)
    return jsonify(xt.to_dict(orient="records"))


@app.route("/api/match/<int:match_id>/stats")
def match_stats(match_id):
    df = _load_match(match_id)
    if df.empty:
        return jsonify({})

    teams = sorted(df["team"].dropna().unique().tolist())
    result = {}
    for t in teams:
        td = df[df["team"] == t]
        passes = td[td["type"] == "Pass"]
        succ = passes[passes["outcome_type"].str.lower() == "successful"]
        shots = td[td["type"].isin(["MissedShots", "SavedShots", "Goal", "ShotOnPost"])]
        goals = td[td["type"] == "Goal"]
        fouls = td[td["type"] == "Foul"]
        tackles = td[td["type"] == "Tackle"]
        corners = td[td["type"] == "CornerAwarded"]
        result[t] = {
            "passes": int(len(passes)),
            "passAccuracy": round(len(succ) / max(len(passes), 1) * 100, 1),
            "shots": int(len(shots)),
            "goals": int(len(goals)),
            "fouls": int(len(fouls)),
            "tackles": int(len(tackles)),
            "corners": int(len(corners)),
        }
    return jsonify(result)


@app.route("/api/match/<int:match_id>/shots")
def match_shots(match_id):
    df = _load_match(match_id)
    if df.empty:
        return jsonify([])
    shots = df[df["type"].isin(["MissedShots", "SavedShots", "Goal", "ShotOnPost"])]
    return jsonify(shots.fillna("").to_dict(orient="records"))


@app.route("/api/match/<int:match_id>/timeline")
def match_timeline(match_id):
    df = _load_match(match_id)
    if df.empty:
        return jsonify([])
    key_types = ["Pass", "Goal", "MissedShots", "SavedShots", "Foul", "Tackle"]
    filtered = df[df["type"].isin(key_types) & df["team"].notna()]
    grouped = filtered.groupby(["minute", "type", "team"]).size().reset_index(name="count")
    return jsonify(grouped.fillna("").to_dict(orient="records"))


@app.route("/api/team/<team_name>/passes")
def team_passes(team_name):
    season = request.args.get("season")
    df = _team_season_data(team_name, season)
    if df.empty:
        return jsonify([])
    player = request.args.get("player")
    if player:
        df = df[df["player"] == player]
    return jsonify(df.head(5000).fillna("").to_dict(orient="records"))


@app.route("/api/team/<team_name>/xt")
def team_xt(team_name):
    season = request.args.get("season")
    df = _team_season_data(team_name, season)
    if df.empty:
        return jsonify([])
    xt = engine.calculate_xt(df)
    return jsonify(xt.to_dict(orient="records"))


@app.route("/api/team/<team_name>/stats")
def team_stats(team_name):
    """Aggregated stats across all matches for a team, optionally filtered by season."""
    season = request.args.get("season")
    td = _team_all_events(team_name, season)

    if td.empty:
        return jsonify({})

    passes = td[td["type"] == "Pass"]
    succ = passes[passes["outcome_type"].str.lower() == "successful"]
    shots = td[td["type"].isin(["MissedShots", "SavedShots", "Goal", "ShotOnPost"])]
    goals = td[td["type"] == "Goal"]
    fouls = td[td["type"] == "Foul"]
    tackles = td[td["type"] == "Tackle"]

    xt = engine.calculate_xt(td)
    total_xt = round(float(xt["xt_added"].sum()), 2) if not xt.empty else 0

    return jsonify({
        "passes": int(len(passes)),
        "passAccuracy": round(len(succ) / max(len(passes), 1) * 100, 1),
        "shots": int(len(shots)),
        "goals": int(len(goals)),
        "fouls": int(len(fouls)),
        "tackles": int(len(tackles)),
        "totalXt": total_xt,
    })


@app.route("/api/match/<int:match_id>/average-touches")
def match_average_touches(match_id):
    """Calculate average player positions. Data is already normalized per-team (0=own goal, 100=opponent goal)."""
    df = _load_match(match_id)
    if df.empty:
        return jsonify([])

    # Convert coordinates to numeric
    df[["x", "y"]] = df[["x", "y"]].apply(pd.to_numeric, errors="coerce")

    # Filter to touches (events with player, x, y coordinates)
    if "is_touch" in df.columns:
        touch_mask = df["is_touch"].astype(str).str.lower() == "true"
        touches = df[touch_mask].copy()
        if touches.empty:
            touches = df.dropna(subset=["player", "x", "y"]).copy()
    else:
        touches = df.dropna(subset=["player", "x", "y"]).copy()

    if touches.empty:
        return jsonify([])

    # Calculate average positions directly (data is already normalized per-team)
    avg_positions = touches.groupby(['team', 'player']).agg(
        avg_x=('x', 'mean'),
        avg_y=('y', 'mean'),
        touches_count=('x', 'count')
    ).reset_index()

    # Filter players with >= 10 touches
    avg_positions = avg_positions[avg_positions['touches_count'] >= 10]

    # Identify starters: top 11 players by touch count per team
    starters = set()
    for team in avg_positions['team'].unique():
        team_players = avg_positions[avg_positions['team'] == team].nlargest(11, 'touches_count')
        starters.update(team_players['player'].tolist())

    # Add is_starter flag
    avg_positions['is_starter'] = avg_positions['player'].isin(starters)

    return jsonify(avg_positions.to_dict(orient="records"))


# ---------- ENHANCED FORMATION VISUALIZATION ----------

def _get_player_jersey(df, player_name):
    """Extract jersey number for a player."""
    import ast
    player_events = df[df["player"] == player_name]
    for _, event in player_events.iterrows():
        qualifiers = event.get("qualifiers", "[]")
        try:
            qual_list = ast.literal_eval(qualifiers) if isinstance(qualifiers, str) else []
            for q in qual_list:
                if q.get('type', {}).get('displayName') == 'JerseyNumber':
                    return str(int(q.get('value')))
        except:
            pass
    # Fallback: use first letter of last name
    return (player_name.split()[-1][0] if player_name else "?")


def _cluster_into_lines(players_list):
    """Group players into positional lines based on x position gaps."""
    if len(players_list) < 3:
        return []

    # Sort by x position
    sorted_players = sorted(players_list, key=lambda p: p['avg_x'])

    # Skip goalkeeper (lowest x)
    outfield = sorted_players[1:] if len(sorted_players) > 1 else []
    if len(outfield) < 2:
        return []

    # Calculate x gaps to detect line breaks
    x_values = [p['avg_x'] for p in outfield]
    gaps = [x_values[i+1] - x_values[i] for i in range(len(x_values)-1)]

    if not gaps:
        return []

    # Adaptive threshold based on quantiles
    gaps_sorted = sorted(gaps)
    threshold = gaps_sorted[max(0, int(len(gaps_sorted) * 0.65))]

    # Group into lines
    lines = []
    current_line = [outfield[0]]

    for i in range(1, len(outfield)):
        if outfield[i]['avg_x'] - current_line[-1]['avg_x'] > threshold:
            lines.append(current_line)
            current_line = [outfield[i]]
        else:
            current_line.append(outfield[i])
    lines.append(current_line)

    return lines


def _get_line_centroids(lines):
    """Calculate centroid for each line."""
    centroids = []
    for line in lines:
        if line:
            avg_x = sum(p['avg_x'] for p in line) / len(line)
            avg_y = sum(p['avg_y'] for p in line) / len(line)
            centroids.append({'x': avg_x, 'y': avg_y})
    return centroids


@app.route("/api/match/<int:match_id>/formation-enhanced")
def match_formation_enhanced(match_id):
    """Return enhanced formation data with jersey numbers and player connections."""
    df = _load_match(match_id)
    if df.empty:
        return jsonify({})

    # Convert coordinates to numeric
    df[["x", "y"]] = df[["x", "y"]].apply(pd.to_numeric, errors="coerce")

    # Filter to touches
    if "is_touch" in df.columns:
        touch_mask = df["is_touch"].astype(str).str.lower() == "true"
        touches = df[touch_mask].copy()
        if touches.empty:
            touches = df.dropna(subset=["player", "x", "y"]).copy()
    else:
        touches = df.dropna(subset=["player", "x", "y"]).copy()

    if touches.empty:
        return jsonify({})

    # Calculate average positions
    avg_positions = touches.groupby(['team', 'player']).agg(
        avg_x=('x', 'mean'),
        avg_y=('y', 'mean'),
        touches_count=('x', 'count')
    ).reset_index()

    # Filter players with >= 10 touches
    avg_positions = avg_positions[avg_positions['touches_count'] >= 10]

    # Identify starters
    starters = set()
    for team in avg_positions['team'].unique():
        team_players = avg_positions[avg_positions['team'] == team].nlargest(11, 'touches_count')
        starters.update(team_players['player'].tolist())

    # Add jersey numbers
    avg_positions['jersey'] = avg_positions['player'].apply(
        lambda p: _get_player_jersey(df, p)
    )
    avg_positions['is_starter'] = avg_positions['player'].isin(starters)

    # Build response with connections per team
    result = {}
    for team in sorted(avg_positions['team'].unique()):
        team_data = avg_positions[avg_positions['team'] == team].to_dict('records')

        # Get top 11 players (starters)
        top_11 = sorted(team_data, key=lambda p: p['touches_count'], reverse=True)[:11]

        # Cluster into lines
        lines = _cluster_into_lines(top_11)
        centroids = _get_line_centroids(lines)

        # Build connections
        connections = []

        # Connections between adjacent lines
        for i in range(len(centroids) - 1):
            c1 = centroids[i]
            c2 = centroids[i + 1]
            connections.append({
                'type': 'line_connection',
                'from': {'x': c1['x'], 'y': c1['y']},
                'to': {'x': c2['x'], 'y': c2['y']}
            })

        # Connections within lines
        for line in lines:
            for i, p1 in enumerate(line):
                for j, p2 in enumerate(line):
                    if i < j:
                        connections.append({
                            'type': 'in_line',
                            'from': {'x': p1['avg_x'], 'y': p1['avg_y']},
                            'to': {'x': p2['avg_x'], 'y': p2['avg_y']}
                        })

        result[team] = {
            'players': top_11,
            'connections': connections,
            'lines': [[p['player'] for p in line] for line in lines]
        }

    return jsonify(result)


# ---------- AI SUMMARY ENDPOINTS ----------

def _get_gemini_summary(match_id, team_name):
    """Generate AI summary using Google Gemini API."""
    try:
        import google.generativeai as genai

        api_key = os.getenv('GEMINI_API_KEY')
        if not api_key:
            return None

        genai.configure(api_key=api_key)

        # Get match data
        df = _load_match(match_id)
        if df.empty:
            return None

        # Get positions and substitutions
        positions = calculate_average_positions(df)
        subs = extract_substitutions(df)

        # Build context for AI
        team_players = positions[positions['team'] == team_name]
        starters = team_players[team_players['is_starter']].nlargest(11, 'touches_count')
        subs_in = team_players[~team_players['is_starter']]

        formation = detect_formation(starters)

        prompt = f"""Analyze this football match formation data and provide insights:

Match ID: {match_id}
Team: {team_name}
Formation: {formation}

Starting XI (by touches):
{starters[['player', 'touches_count', 'avg_x', 'avg_y']].to_string()}

Substitutes with touches:
{subs_in[['player', 'touches_count']].to_string() if not subs_in.empty else 'None'}

Substitutions made:
{json.dumps([s for s in subs if s['team'] == team_name], indent=2) if subs else 'None'}

Please provide a brief tactical analysis (2-3 sentences) about:
1. The formation and how the team was positioned
2. Key players by touch/involvement
3. Any tactical changes from substitutions
Keep it concise and focused on formation and positioning."""

        model = genai.GenerativeModel('gemini-pro')
        response = model.generate_content(prompt)
        return response.text if response else None

    except Exception as e:
        print(f"Error generating Gemini summary: {e}")
        return None


def detect_formation(players):
    """Detect formation from player positions."""
    if len(players) < 10:
        return "Unknown"

    sorted_p = players.sort_values('avg_x').reset_index(drop=True)
    outfield = sorted_p.iloc[1:] if len(sorted_p) > 1 else sorted_p

    if len(outfield) < 9:
        return "Unknown"

    x_values = outfield['avg_x'].values
    gaps = [x_values[i+1] - x_values[i] for i in range(len(x_values)-1)]

    if not gaps:
        return "Unknown"

    threshold = sorted(gaps)[int(len(gaps) * 0.65)] if gaps else 0
    lines = []
    current_line = [outfield.iloc[0]]

    for i in range(1, len(outfield)):
        if outfield.iloc[i]['avg_x'] - current_line[-1]['avg_x'] > threshold:
            lines.append(len(current_line))
            current_line = [outfield.iloc[i]]
        else:
            current_line.append(outfield.iloc[i])

    lines.append(len(current_line))
    return "-".join(map(str, lines))


@app.route("/api/match/<int:match_id>/ai-summary")
def match_ai_summary(match_id):
    """Get AI-powered formation summary."""
    team = request.args.get("team")
    if not team:
        return jsonify({"error": "team parameter required"}), 400

    # Check if AI is enabled
    if os.getenv('ENABLE_AI_SUMMARY') != 'True':
        return jsonify({"error": "AI summary disabled"}), 403

    summary = _get_gemini_summary(match_id, team)
    return jsonify({"summary": summary})


# ---------- serve frontend ----------

@app.route("/")
def index():
    return send_from_directory("templates", "index.html")


@app.route("/static/<path:path>")
def serve_static(path):
    return send_from_directory("static", path)


if __name__ == "__main__":
    print(f"Loaded {len(_all_match_ids())} matches from disk.")
    app.run(debug=True, port=5050)
