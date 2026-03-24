import os
import pandas as pd
from supabase import create_client, Client
from dotenv import load_dotenv
from xAssassin.metrices import TacticalEngine

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

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

