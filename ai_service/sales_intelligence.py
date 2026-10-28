import json
from collections import Counter

def generate_farmer_dashboard(vendor_id, db_filepath="elevoni_mock_db.json"):
    # Load the database
    with open(db_filepath, "r") as f:
        db = json.load(f)

    # 1. Enforce Tenant Isolation: Filter ONLY this vendor's orders
    vendor_orders = [order for order in db["orders"] if order["vendor_id"] == vendor_id]
    
    if not vendor_orders:
        return {"error": "No data found or unauthorized access."}

    # 2. Process the valid data
    total_revenue = 0
    completed_orders = 0
    buyer_history = Counter()
    location_demand = Counter()

    for order in vendor_orders:
        # Exclude cancelled orders from revenue
        if order["status"] != "cancelled":
            total_revenue += order["total_amount"]
            completed_orders += 1
            buyer_history[order["buyer_id"]] += 1
            location_demand[order["delivery_state"]] += order["quantity"]

    # 3. Identify repeat customers (buyers with > 1 completed order)
    repeat_customers = sum(1 for count in buyer_history.values() if count > 1)

    # 4. Structure the intelligence report
    report = {
        "vendor_id": vendor_id,
        "metrics": {
            "total_completed_orders": completed_orders,
            "total_revenue_ngn": total_revenue,
            "unique_customers": len(buyer_history),
            "repeat_customers": repeat_customers
        },
        "top_demand_locations": dict(location_demand.most_common(3))
    }

    return report

if __name__ == "__main__":
    # Test the logic for Vendor v101 (Green Pastures Poultry)
    v101_report = generate_farmer_dashboard("v101")
    print(json.dumps(v101_report, indent=4))