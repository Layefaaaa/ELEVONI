import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import api from "../../api";
import PricingTiersFields from "../../components/PricingTiersFields";
import "../AddProduct/AddProduct.css";

const hasTierRows = (tiers) => (tiers || []).some((tier) => String(tier?.minQuantity ?? "").trim() !== "");

const EditProduct = ({ url }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    api.get(url + "/api/fish/admin/" + id)
      .then((response) => {
        const product = response.data?.data;
        if (!product) throw new Error("Product not found");
        if (active) setData({
          name: product.name,
          description: product.description,
          price: String(product.price),
          category: product.category,
          visible: product.visible !== false,
          pricingMode: product.pricingMode === "tiered" ? "tiered" : "single",
          pricingTiers: (product.pricingTiers || []).map((tier) => ({
            minQuantity: tier.minQuantity,
            maxQuantity: tier.maxQuantity ?? null,
            unitPrice: tier.unitPrice
          }))
        });
      })
      .catch((error) => toast.error(error.response?.data?.message || error.message || "Unable to load product"))
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id, url]);

  const onSubmit = async (event) => {
    event.preventDefault();
    try {
      const response = await api.put(url + "/api/fish/" + id, { ...data, price: Number(data.price), visible: Boolean(data.visible), pricingMode: hasTierRows(data.pricingTiers) ? "tiered" : "single" });
      if (!response.data.success) throw new Error(response.data.message || "Product could not be updated");
      toast.success("Product updated");
      navigate("/list");
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || "Failed to update product");
    }
  };

  if (loading) return <p role="status">Loading product...</p>;
  if (!data) return <p>Product could not be loaded. Return to the product list and try again.</p>;

  return (
    <form onSubmit={onSubmit} className="add-form">
      <h2>Edit Product</h2>
      <input name="name" value={data.name} placeholder="Name" onChange={(event) => setData({ ...data, name: event.target.value })} required />
      <textarea name="description" value={data.description} placeholder="Description" onChange={(event) => setData({ ...data, description: event.target.value })} required />
      <input name="price" type="number" min="1" step="1" value={data.price} placeholder="Base price (NGN)" onChange={(event) => setData({ ...data, price: event.target.value })} required />
      <select name="category" value={data.category} onChange={(event) => setData({ ...data, category: event.target.value })}>
        <option value="Smoked">Smoked</option>
        <option value="Fresh">Fresh</option>
      </select>
      <label className="visibility-toggle">
        <input
          type="checkbox"
          name="visible"
          checked={data.visible}
          onChange={(event) => setData({ ...data, visible: event.target.checked })}
        />
        Listed in the storefront
      </label>
      <PricingTiersFields tiers={data.pricingTiers} onChange={(pricingTiers) => setData({ ...data, pricingTiers })} />
      <button type="submit">Save Product</button>
      <button type="button" onClick={() => navigate("/list")}>Cancel</button>
    </form>
  );
};

export default EditProduct;
