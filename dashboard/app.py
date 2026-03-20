import streamlit as st
from config import apply_theme, NEON_GREEN, NEON_CYAN, NEON_ORANGE, NEON_PINK, DARK_CARD

st.set_page_config(
    page_title="xAssassin",
    page_icon="⚽",
    layout="wide",
    initial_sidebar_state="expanded",
)
apply_theme()

# --- HEADER ---
st.markdown(
    f"""
    <div style="text-align:center; padding: 2rem 0 0.5rem;">
        <h1 style="font-size:3rem; font-weight:800; margin:0;
                    background: linear-gradient(90deg, {NEON_GREEN}, {NEON_CYAN});
                    -webkit-background-clip: text; -webkit-text-fill-color: transparent;">
            xAssassin
        </h1>
        <p style="color:#a0a0a0; font-size:1.1rem; margin-top:0.3rem;">
            Tactical Intelligence Dashboard &mdash; Premier League Analytics
        </p>
    </div>
    """,
    unsafe_allow_html=True,
)

st.divider()

# --- PAGE CARDS ---
st.markdown("### Explore")

col1, col2, col3 = st.columns(3)

with col1:
    st.markdown(
        f"""
        <div style="background:{DARK_CARD}; border:1px solid #3a3a4a; border-radius:12px;
                    padding:24px; height:200px; display:flex; flex-direction:column; justify-content:space-between;">
            <div>
                <span style="font-size:2rem;">🎯</span>
                <h3 style="margin:8px 0 4px; color:{NEON_GREEN};">Pass Maps</h3>
                <p style="color:#a0a0a0; font-size:0.9rem;">
                    Visualize every successful pass on the pitch.
                    Single match or full season view.
                </p>
            </div>
        </div>
        """,
        unsafe_allow_html=True,
    )

with col2:
    st.markdown(
        f"""
        <div style="background:{DARK_CARD}; border:1px solid #3a3a4a; border-radius:12px;
                    padding:24px; height:200px; display:flex; flex-direction:column; justify-content:space-between;">
            <div>
                <span style="font-size:2rem;">⚡</span>
                <h3 style="margin:8px 0 4px; color:{NEON_CYAN};">Shot-Creating Actions</h3>
                <p style="color:#a0a0a0; font-size:0.9rem;">
                    Discover who creates the most dangerous chances
                    with SCA leaderboards.
                </p>
            </div>
        </div>
        """,
        unsafe_allow_html=True,
    )

with col3:
    st.markdown(
        f"""
        <div style="background:{DARK_CARD}; border:1px solid #3a3a4a; border-radius:12px;
                    padding:24px; height:200px; display:flex; flex-direction:column; justify-content:space-between;">
            <div>
                <span style="font-size:2rem;">🔥</span>
                <h3 style="margin:8px 0 4px; color:{NEON_ORANGE};">Expected Threat</h3>
                <p style="color:#a0a0a0; font-size:0.9rem;">
                    xT heatmaps &amp; leaderboards to measure ball
                    progression into dangerous zones.
                </p>
            </div>
        </div>
        """,
        unsafe_allow_html=True,
    )

col4, col5, _ = st.columns(3)

with col4:
    st.markdown(
        f"""
        <div style="background:{DARK_CARD}; border:1px solid #3a3a4a; border-radius:12px;
                    padding:24px; height:200px; display:flex; flex-direction:column; justify-content:space-between;">
            <div>
                <span style="font-size:2rem;">📊</span>
                <h3 style="margin:8px 0 4px; color:{NEON_PINK};">Match Summary</h3>
                <p style="color:#a0a0a0; font-size:0.9rem;">
                    Full match breakdown &mdash; possession, shots, fouls,
                    and key events at a glance.
                </p>
            </div>
        </div>
        """,
        unsafe_allow_html=True,
    )

with col5:
    st.markdown(
        f"""
        <div style="background:{DARK_CARD}; border:1px solid #3a3a4a; border-radius:12px;
                    padding:24px; height:200px; display:flex; flex-direction:column; justify-content:space-between;">
            <div>
                <span style="font-size:2rem;">⚔️</span>
                <h3 style="margin:8px 0 4px; color:{NEON_GREEN};">Team Comparison</h3>
                <p style="color:#a0a0a0; font-size:0.9rem;">
                    Go head-to-head &mdash; compare passing, threat, and
                    chance creation between any two squads.
                </p>
            </div>
        </div>
        """,
        unsafe_allow_html=True,
    )

st.divider()
st.markdown(
    "<p style='text-align:center; color:#555; font-size:0.8rem;'>"
    "Use the sidebar to navigate between pages."
    "</p>",
    unsafe_allow_html=True,
)
