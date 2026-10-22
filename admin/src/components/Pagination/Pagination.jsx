import "./Pagination.css";

const Pagination = ({ pagination, onPageChange }) => {
  if (!pagination || !pagination.totalPages || pagination.totalPages <= 1) {
    return null;
  }

  const { page, totalPages, total, hasNext, hasPrevious } = pagination;

  return (
    <div className="pagination">
      <button
        type="button"
        className="pagination-btn"
        onClick={() => onPageChange(page - 1)}
        disabled={!hasPrevious}
      >
        Previous
      </button>
      <span className="pagination-status">
        Page {page} of {totalPages} &middot; {total} total
      </span>
      <button
        type="button"
        className="pagination-btn"
        onClick={() => onPageChange(page + 1)}
        disabled={!hasNext}
      >
        Next
      </button>
    </div>
  );
};

export default Pagination;
