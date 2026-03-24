"""
Shared configuration for the xAssassin Dashboard.
All colors, styles, and database config live here to keep pages consistent.
"""
import os
import streamlit as st
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

# --- DATABASE ---
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

# --- COLOUR PALETTE (neo-noir) ---
PITCH_BG = "#1e1e1e"
PITCH_LINE = "#c7d5cc"
NEON_GREEN = "#00ff85"
NEON_CYAN = "#00d4ff"
NEON_ORANGE = "#ff6b35"
NEON_PINK = "#ff2d7b"
NEON_YELLOW = "#f5e642"
DARK_CARD = "#262730"
TEXT_LIGHT = "#fafafa"
TEXT_DIM = "#a0a0a0"

PL_TEAMS = [
    "Arsenal", "Aston Villa", "Bournemouth", "Brentford", "Brighton",
    "Chelsea", "Crystal Palace", "Everton", "Fulham", "Ipswich",
    "Leicester", "Liverpool", "Manchester City", "Manchester United",
    "Newcastle", "Nottingham Forest", "Southampton", "Tottenham",
    "West Ham", "Wolves",
]

# --- CUSTOM CSS  ---
CUSTOM_CSS = """
<style>
    /* Metric cards */
    div[data-testid="stMetric"] {
        background-color: #262730;
        border: 1px solid #3a3a4a;
        border-radius: 10px;
        padding: 16px 20px;
    }
    div[data-testid="stMetric"] label {
        color: #a0a0a0 !important;
        font-size: 0.85rem !important;
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }
    div[data-testid="stMetric"] [data-testid="stMetricValue"] {
        color: #00ff85 !important;
        font-size: 1.8rem !important;
        font-weight: 700;
    }
    /* Sidebar styling */
    section[data-testid="stSidebar"] > div {
        padding-top: 1.5rem;
    }
    /* Table header accent */
    thead tr th {
        background-color: #262730 !important;
        color: #00ff85 !important;
    }
</style>
"""


@st.cache_resource
def get_supabase():
    return create_client(SUPABASE_URL, SUPABASE_KEY)


def apply_theme():
    """Inject shared CSS into any page."""
    st.markdown(CUSTOM_CSS, unsafe_allow_html=True)
