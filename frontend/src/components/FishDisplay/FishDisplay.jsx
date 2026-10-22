import { useContext } from "react";
import "./FishDisplay.css";
import { StoreContext } from "../../context/StoreContext";
import FishItem from "../FishItem/FishItem";

const FishDisplay = ({
  eyebrow = "The Elevoni favourite",
  title = "Smoked Catfish, ready for your table",
  intro = "One carefully prepared product, with clear per-kilogram wholesale pricing.",
  sectionId = "fish-display",
}) => {
  const { fish_list, catalogueLoading, catalogueError } = useContext(StoreContext);

  const products = Array.isArray(fish_list) ? fish_list : [];

  return (
    <section className="fish-display" id={sectionId}>
      <div className="fish-display-heading">
        <p className="fish-display-eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
        <p className="fish-display-intro">{intro}</p>
      </div>
      {catalogueLoading ? (
        <p className="fish-display-state">Loading the current catalogue…</p>
      ) : catalogueError ? (
        <p className="fish-display-state">
          We could not load the catalogue right now. Please try again in a moment.
        </p>
      ) : products.length === 0 ? (
        <p className="fish-display-state">
          No products are listed in this category right now.
        </p>
      ) : (
        <div className="fish-display-list">
          {products.map((item) => (
            <FishItem
              key={item._id}
              id={item._id}
              name={item.name}
              description={item.description}
              price={item.price}
              pricingMode={item.pricingMode}
              pricingTiers={item.pricingTiers}
              image={item.image}
            />
          ))}
        </div>
      )}
    </section>
  );
};

export default FishDisplay;
