import json
import os

def load_mock_db():
    # Load synthetic dataset containing vendors and products
    db_path = os.path.join(os.path.dirname(__file__), 'elevoni_mock_db.json')
    if not os.path.exists(db_path):
        return None
    with open(db_path, 'r') as f:
        return json.load(f)

def match_farmers(required_category: str, required_quantity: int, buyer_state: str, buyer_lga: str = None):
    db = load_mock_db()
    if not db:
        return {"error": "Database file not found"}

    vendors = {v["vendor_id"]: v for v in db.get("vendors", [])}
    products = db.get("products", [])
    
    matches = []

    for product in products:
        # 1. Filter by category match
        if product.get("category", "").lower() != required_category.lower():
            continue
            
        vendor_id = product.get("vendor_id")
        vendor = vendors.get(vendor_id, {})
        
        # 2. Check vendor verification and stock availability
        stock = product.get("stock_quantity", 0)
        is_verified = vendor.get("is_verified", False)
        
        if stock < required_quantity:
            continue

        # 3. Transparent Proximity Scoring
        vendor_state = vendor.get("state", "")
        vendor_lga = vendor.get("lga", "")
        
        score = 0
        location_reason = ""

        if buyer_lga and vendor_lga.lower() == buyer_lga.lower() and vendor_state.lower() == buyer_state.lower():
            score += 50
            location_reason = f"Same LGA ({vendor_lga})"
        elif vendor_state.lower() == buyer_state.lower():
            score += 30
            location_reason = f"Same State ({vendor_state})"
        else:
            score += 10
            location_reason = f"Out of State ({vendor_state})"

        if is_verified:
            score += 20  # Boost for verified suppliers

        matches.append({
            "vendor_id": vendor_id,
            "business_name": vendor.get("business_name"),
            "product_name": product.get("name"),
            "available_stock": stock,
            "unit_price_ngn": product.get("price"),
            "is_verified": is_verified,
            "location": f"{vendor_lga}, {vendor_state}",
            "match_score": score,
            "match_reasons": [location_reason, "Verified Supplier" if is_verified else "Unverified Supplier"]
        })

    # Rank highest score first
    ranked_matches = sorted(matches, key=lambda x: x["match_score"], reverse=True)
    
    return {
        "query": {
            "category": required_category,
            "quantity": required_quantity,
            "buyer_state": buyer_state,
            "buyer_lga": buyer_lga
        },
        "total_matches": len(ranked_matches),
        "matches": ranked_matches
    }

# Quick local test runner
if __name__ == "__main__":
    test_result = match_farmers(
        required_category="Poultry & Eggs",
        required_quantity=10,
        buyer_state="FCT Abuja",
        buyer_lga="Abuja Municipal"
    )
    print(json.dumps(test_result, indent=2))