import pandas as pd
from supabase import create_client, Client
from xAssassin.metrices import TacticalEngine

SUPERBASE_URL="https://iktrobshaarinqhzuirb.supabase.co"
SUPERBASE_KEY="sb_publishable_7yvklXukzWCGMhIG6zgOqQ_2-0s_F0r"
supabase: Client=create_client(SUPERBASE_URL, SUPERBASE_KEY)

game_id=1821050

print("Fetching Match Data from the cloud Vault..")
response=supabase.table("events").select("*").eq("game_id", game_id).execute()

match_df=pd.DataFrame(response.data)

print("Calculating SCA..")
engine=TacticalEngine()
sca_board=engine.calculate_sca(match_df)

print("\n------Match SCA Leaderboard------")
print(sca_board.head(10))

print("\n-----Match xT Leaderboard----")
sca_board=engine.calculate_xt(match_df)
print(sca_board.head(5))

