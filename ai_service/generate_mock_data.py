import json
import random
from datetime import datetime, timedelta

def generate_data():
    # 1. Generate Vendors (Farmers)
    vendors = [
        {"vendor_id": "v101", "businessName": "Green Pastures Poultry", "state": "FCT Abuja", "lga": "Bwari"},
        {"vendor_id": "v102", "businessName": "Kano Cattle Syndicate", "state": "Kano", "lga": "Dala"}
    ]

    # 2. Generate Products linked to Vendors
    products = [
        {"product_id": "p201", "vendor_id": "v101", "name": "Live Broiler Chicken", "category": "Poultry & Eggs", "price": 4500},
        {"product_id": "p202", "vendor_id": "v102", "name": "Adult Ram", "category": "Livestock & Meat", "price": 120000}
    ]

    # 3. Generate Orders with Vendor Attribution (The Fix)
    orders = []
    statuses = ["delivered", "processing", "cancelled"]
    
    for i in range(15):  # Create 15 synthetic orders
        product = random.choice(products)
        qty = random.randint(1, 50)
        
        # Simulate dates over the last 30 days
        days_ago = random.randint(0, 30)
        order_date = (datetime.now() - timedelta(days=days_ago)).isoformat()
        
        order = {
            "order_id": f"ord_{300+i}",
            "buyer_id": f"usr_{random.randint(1, 5)}", # Simulates repeat buyers
            "vendor_id": product["vendor_id"], # Our critical fix
            "product_id": product["product_id"],
            "product_name": product["name"],
            "quantity": qty,
            "total_amount": qty * product["price"],
            "order_date": order_date,
            "status": random.choice(statuses),
            "delivery_state": "FCT Abuja"
        }
        orders.append(order)

    # Save to JSON
    dataset = {"vendors": vendors, "products": products, "orders": orders}
    with open("elevoni_mock_db.json", "w") as f:
        json.dump(dataset, f, indent=4)
        
    print("Synthetic database created: elevoni_mock_db.json")

if __name__ == "__main__":
    generate_data()