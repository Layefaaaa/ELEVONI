import "./Reviews.css";
import axios from "axios";
import { useState, useEffect, useContext, useCallback } from "react";
import { StoreContext } from "../../context/StoreContext";
import { toast } from "react-toastify";

const Reviews = () => {
  const { url, token } = useContext(StoreContext);
  const [reviews, setReviews] = useState([]);
  const [comment, setComment] = useState("");
  const [rating, setRating] = useState(5);
  const [visibleCount, setVisibleCount] = useState(5);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const response = await axios.get(`${url}/api/review/list`);
      if (response.data?.success && Array.isArray(response.data.data)) {
        setReviews(response.data.data);
      } else {
        throw new Error("The review service returned an unexpected response.");
      }
    } catch (error) {
      setLoadError(error.response?.data?.message || "Customer reviews could not be loaded right now.");
    } finally {
      setLoading(false);
    }
  }, [url]);

  const submitReview = async (event) => {
    event.preventDefault();
    if (!token) {
      toast.error("Please sign in before leaving a review.");
      return;
    }
    try {
      const response = await axios.post(`${url}/api/review/add`, { comment, rating }, { headers: { token } });
      if (response.data?.success) {
        toast.success("Review submitted for approval.");
        setComment("");
        setRating(5);
        await fetchReviews();
      } else {
        toast.error(response.data?.message || "Failed to submit review.");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not submit the review. Please try again.");
    }
  };

  useEffect(() => { fetchReviews(); }, [fetchReviews]);

  return (
    <section className="reviews" id="reviews" aria-labelledby="reviews-title">
      <h2 id="reviews-title">Customer Reviews</h2>
      <form className="review-form" onSubmit={submitReview}>
        <label className="sr-only" htmlFor="review-comment">Your review</label>
        <textarea id="review-comment" placeholder="Share your experience…" value={comment} onChange={(event) => setComment(event.target.value)} required maxLength={1000} />
        <label className="sr-only" htmlFor="review-rating">Rating</label>
        <select id="review-rating" value={rating} onChange={(event) => setRating(Number(event.target.value))}>
          <option value="5">5 Stars</option><option value="4">4 Stars</option><option value="3">3 Stars</option><option value="2">2 Stars</option><option value="1">1 Star</option>
        </select>
        <button type="submit">Submit Review</button>
      </form>

      <div className="reviews-list" aria-live="polite">
        {loading && <p role="status">Loading customer reviews…</p>}
        {!loading && loadError && <div role="alert"><p>{loadError}</p><button type="button" onClick={fetchReviews}>Try again</button></div>}
        {!loading && !loadError && reviews.length === 0 && <p>No approved reviews are available yet.</p>}
        {!loading && !loadError && reviews.slice(0, visibleCount).map((review) => (
          <article key={review._id} className="review-card">
            <h3>{review.name}</h3>
            <p className="stars" aria-label={`${review.rating} out of 5 stars`}>{"★".repeat(Math.max(0, Math.min(5, Number(review.rating) || 0)))}</p>
            <p className="comment">{review.comment}</p>
          </article>
        ))}
      </div>
      {!loading && !loadError && reviews.length > visibleCount && (
        <div className="show-more-container"><button type="button" className="show-more-btn" onClick={() => setVisibleCount((count) => count + 5)}>Show More</button></div>
      )}
    </section>
  );
};

export default Reviews;
