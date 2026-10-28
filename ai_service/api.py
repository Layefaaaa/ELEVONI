from fastapi import FastAPI, HTTPException
from sales_intelligence import generate_farmer_dashboard

app = FastAPI(title="Elevoni AI & Data API")

@app.get("/api/v1/farmer-dashboard/{vendor_id}")
def get_dashboard(vendor_id: str):
    # Call the reporting logic we just built
    report = generate_farmer_dashboard(vendor_id)
    
    if "error" in report:
        # Return a 403 Forbidden error if data is missing or unauthorized
        raise HTTPException(status_code=403, detail=report["error"])
        
    return report