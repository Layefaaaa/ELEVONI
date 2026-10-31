from fastapi import FastAPI, HTTPException, Query
from sales_intelligence import generate_farmer_dashboard
from matching_engine import match_farmers

app = FastAPI(title="Elevoni AI & Data API")

@app.get("/api/v1/farmer-dashboard/{vendor_id}")
def get_dashboard(vendor_id: str):
    report = generate_farmer_dashboard(vendor_id)
    if "error" in report:
        raise HTTPException(status_code=403, detail=report["error"])
    return report

@app.get("/api/v1/match-farmers")
def get_matches(
    category: str = Query(..., description="Product category like 'Poultry & Eggs'"),
    quantity: int = Query(..., description="Minimum stock required"),
    buyer_state: str = Query(..., description="Buyer's state location"),
    buyer_lga: str = Query(None, description="Buyer's LGA location")
):
    # Call the matching logic we just built
    return match_farmers(category, quantity, buyer_state, buyer_lga)