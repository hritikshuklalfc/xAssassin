import soccerdata as sd
import os
import pandas as pd
import time
import random


data_dir="data/raw_event"
os.makedirs(data_dir, exist_ok=True)

print("Initialising xAssassin Fetcher...")
ws_scraper = sd.WhoScored(leagues="ENG-Premier League", seasons=["2526", "2425", "2324"], headless=False)

schedule_df=ws_scraper.read_schedule().reset_index()

match_ids=schedule_df["game_id"].dropna().unique()

print(f"Scraping event data for Match ID: {len(match_ids)} across selected seasons....")

for match_id in match_ids:
    file_path=f"{data_dir}/match_{match_id}_events.csv"
    
    if os.path.exists(file_path):
        print(f"Match {match_id} already exists. Skipping...")
        continue
    
    print(f"scrapping match ids: {match_id}...")
    try:
        event_df = ws_scraper.read_events(match_id=[int(match_id)])
        event_df.to_csv(file_path, index=False)
        print(f"Sucess: Saved {match_id}.")
        
        sleep_time=random.uniform(5, 12)
        time.sleep(sleep_time)
        
    except Exception as e:
        print(f"Error on {match_id}: {e}")
        
        print("Taking a 2-mins long before trying for the new match...")
        time.sleep(120)