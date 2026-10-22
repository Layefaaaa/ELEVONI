import api from "../../api";
import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import Pagination from "../../components/Pagination/Pagination";
import "./Reviews.css";

const PAGE_SIZE = 20;

const Reviews = ({ url }) => {
  const [reviews, setReviews] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);

  const fetchReviews = useCallback(async (targetPage = 1) => {
    try {
      const response = await api.get(`${url}/api/review/admin-list`, {
        params: { page: targetPage, limit: PAGE_SIZE },
      });
      if (response.data.success) {
        setReviews(response.data.data);
        setPagination(response.data.pagination || null);
        setPage(targetPage);
      } else {
        toast.error(response.data.message || "Unable to load reviews");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to load reviews");
    }
  }, [url]);

  const approveReview = async (id) => {
    try {
      const response = await api.post(`${url}/api/review/approve`, { id });
      if (response.data.success) {
        toast.success("Review approved");
        await fetchReviews(page);
      } else {
        toast.error(response.data.message || "Unable to approve review");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to approve review");
    }
  };

  const deleteReview = async (id) => {
    try {
      const response = await api.post(`${url}/api/review/delete`, { id });
      if (response.data.success) {
        toast.success("Review deleted");
        await fetchReviews(page);
      } else {
        toast.error(response.data.message || "Unable to delete review");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to delete review");
    }
  };

  useEffect(() => {
    fetchReviews(1);
  }, [fetchReviews]);

  return (
    <div className="reviews">
      <h2>Manage Reviews</h2>

      <div className="reviews-list">
        {reviews.map((review) => (
          <div key={review._id} className="review-card">
            <div className="review-header">
              <span className="review-name">{review.name}</span>

              <span
                className={`review-status ${
                  review.approved ? "approved" : "pending"
                }`}
              >
                {review.approved ? "Approved" : "Pending"}
              </span>
            </div>

            <div className="review-rating">{"★".repeat(review.rating)}</div>

            <p className="review-comment">{review.comment}</p>

            <div className="review-actions">
              {!review.approved && (
                <button
                  className="approve-btn"
                  onClick={() => approveReview(review._id)}
                >
                  Approve
                </button>
              )}

              <button
                className="delete-btn"
                onClick={() => deleteReview(review._id)}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      <Pagination
        pagination={pagination}
        onPageChange={(nextPage) => fetchReviews(nextPage)}
      />
    </div>
  );
};
export default Reviews;
