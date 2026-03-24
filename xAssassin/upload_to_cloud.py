import os
import pandas as pd
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

print("connecting to superbase cloud vault...")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

data_dir="data/raw_event"
csv_files=[f for f in os.listdir(data_dir) if f.endswith(".csv")]

print(f"Found {len(csv_files)} matches to uplaod")

for file in csv_files:
    file_path=f"{data_dir}/{file}"
    print(f"Uploading {file}...")
    
    try:
        df = pd.read_csv(file_path)
        
        cols_to_keep =  ['game_id', 'minute', 'second', 'team', 'player', 'x', 'y', 'end_x', 'end_y', 'type', 'outcome_type']
        
        df=df[[c for c in cols_to_keep if c in df.columns]]
        int_columns=["game_id", "minute", "second"]
        for col in int_columns:
            if col in df.columns:
                df[col] = df[col].astype("Int64")
        
        df = df.astype(object).where(pd.notnull(df), None)
        
        records = df.to_dict(orient="records")
        
        response=supabase.table("events").insert(records).execute()
        print(f"SUCCESS: Uploaded {len(records)} events from {file}")
        
    except Exception as e:
        print(f"Error Uploading {file}: {e}")
        
print("Cloud Upload Compleated, your data is live...")
        