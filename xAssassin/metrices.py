import pandas as pd

class TacticalEngine:
    def __init__(self):
        pass
    
    def calculate_sca(self, match_df):
        match_df=match_df.sort_values(by=["minute", "second"]).reset_index(drop=True)
        
        shot_conditions = match_df["type"].isin(["MissedShots", "SavedShots", "Goal"])
        shot_indices = match_df[shot_conditions].index
        
        sca_event = []
        
        for idx in shot_indices:
            shot_team = match_df.loc[idx, "team"]
            
            if idx-1>=0:
                action_1=match_df.loc[idx-1]
                if action_1["team"]==shot_team:
                    sca_event.append(action_1)
                    
            if idx-2>=0:
                action_2=match_df.loc[idx-2]
                if action_2["team"]==shot_team:
                    sca_event.append(action_2)
                    
        if sca_event:
            sca_df=pd.DataFrame(sca_event)
            
            sca_leaderboard = sca_df["player"].value_counts().reset_index()
            sca_leaderboard.columns=["Player", "SCA"]
            return sca_leaderboard
        else:
            return pd.DataFrame(columns=["Player", "SCA"])
        
        
    def calculate_xt(self, match_df):
        passes=match_df[(match_df["type"]=="Pass")&(match_df["outcome_type"]=="Successful")].copy()
        if passes.empty:
            return pd.DataFrame(columns=['Player', 'xT Added'])
        
        xt_grid = [
            [0.00638, 0.00779, 0.00844, 0.00977, 0.01126, 0.01248, 0.01473, 0.01853, 0.02412, 0.02756, 0.03467, 0.03792],
            [0.00811, 0.00922, 0.01059, 0.01214, 0.01384, 0.01549, 0.01870, 0.02401, 0.02953, 0.03831, 0.04618, 0.05408],
            [0.01016, 0.01132, 0.01351, 0.01633, 0.01956, 0.02324, 0.02755, 0.03622, 0.04652, 0.06173, 0.08257, 0.10836],
            [0.01139, 0.01257, 0.01551, 0.01983, 0.02435, 0.03058, 0.03800, 0.05193, 0.07172, 0.10330, 0.16568, 0.25287],
            [0.01139, 0.01257, 0.01551, 0.01983, 0.02435, 0.03058, 0.03800, 0.05193, 0.07172, 0.10330, 0.16568, 0.25287],
            [0.01016, 0.01132, 0.01351, 0.01633, 0.01956, 0.02324, 0.02755, 0.03622, 0.04652, 0.06173, 0.08257, 0.10836],
            [0.00811, 0.00922, 0.01059, 0.01214, 0.01384, 0.01549, 0.01870, 0.02401, 0.02953, 0.03831, 0.04618, 0.05408],
            [0.00638, 0.00779, 0.00844, 0.00977, 0.01126, 0.01248, 0.01473, 0.01853, 0.02412, 0.02756, 0.03467, 0.03792]
        ]
        
        def get_grid_value(x, y):
            try:
                x_idx = min(int((float(x) / 100) * 12), 11)
                y_idx = min(int((float(y) / 100) * 8), 7)
                return xt_grid[y_idx][x_idx]
            except:
                return 0.0
            
        passes["start_xt"]=passes.apply(lambda row: get_grid_value(row["x"], row["y"]), axis=1)
        passes["end_xt"]=passes.apply(lambda row: get_grid_value(row["end_x"], row["end_y"]), axis=1)
        passes["xt_added"] = passes["end_xt"] - passes["start_xt"]
        
        passes["xt_added"]=passes["xt_added"].clip(lower=0)
        
        passes["xt_added"]=passes["xt_added"].clip(lower=0)
        
        xt_leaderboard = passes.groupby("player")["xt_added"].sum().reset_index()
        xt_leaderboard=xt_leaderboard.sort_values(by="xt_added", ascending=False).reset_index(drop=True)
        
        xt_leaderboard["xt_added"]=xt_leaderboard["xt_added"].round(3)
        return xt_leaderboard