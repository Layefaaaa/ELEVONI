import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import api from "../../api";
import Pagination from "../../components/Pagination/Pagination";
import {
  DECISIONS,
  DEFAULT_VENDOR_STATUS_FILTER,
  MAX_REVIEW_NOTE_LENGTH,
  VENDOR_PAGE_SIZE,
  VENDOR_STATUS_FILTERS,
  buildVendorListParams,
  canDecide,
  confirmationMessage,
  decisionsForStatus,
  emptyListMessage,
  formatSubmittedAt,
  readApiError,
  readReviewResult,
  readVendorDetail,
  readVendorList,
  statusLabel,
  statusNote,
  validateReviewNote,
  vendorFocusLabel,
} from "../../utils/vendorReview";
import "./Vendors.css";

const statusClass = (status) => `vendors-status vendors-status-${status || "unknown"}`;

const Vendors = ({ url }) => {
  const [status, setStatus] = useState(DEFAULT_VENDOR_STATUS_FILTER);
  const [page, setPage] = useState(1);
  const [applications, setApplications] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [selected, setSelected] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState("");

  const fetchApplications = useCallback(
    async (targetPage = 1) => {
      setListLoading(true);
      setListError("");
      try {
        const response = await api.get(`${url}/api/vendor/admin-list`, {
          params: buildVendorListParams({ status, page: targetPage, limit: VENDOR_PAGE_SIZE }),
        });
        const result = readVendorList(response.data);
        setApplications(result.items);
        setPagination(result.pagination);
        setPage(targetPage);
      } catch (error) {
        setApplications([]);
        setPagination(null);
        setListError(readApiError(error, "Unable to load vendor applications"));
      } finally {
        setListLoading(false);
      }
    },
    [url, status]
  );

  // The selected filter owns the request, including its loading state.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchApplications(1);
  }, [fetchApplications]);

  const changeFilter = (nextStatus) => {
    if (nextStatus === status) return;
    setStatus(nextStatus);
    setSelectedId(null);
    setSelected(null);
    setDetailError("");
    setNote("");
  };

  const openApplication = async (id) => {
    setSelectedId(id);
    setDetailLoading(true);
    setDetailError("");
    setNote("");
    try {
      const response = await api.get(`${url}/api/vendor/admin/${id}`);
      setSelected(readVendorDetail(response.data));
    } catch (error) {
      setSelected(null);
      setDetailError(readApiError(error, "Unable to load the vendor application"));
    } finally {
      setDetailLoading(false);
    }
  };

  const closeApplication = () => {
    setSelectedId(null);
    setSelected(null);
    setDetailError("");
    setNote("");
  };

  const submitDecision = async (decision) => {
    if (!selected || submitting) return;
    if (!canDecide(selected.status, decision)) {
      toast.error("That decision is not available for this application");
      return;
    }

    const validation = validateReviewNote(note);
    if (validation.error) {
      toast.error(validation.error);
      return;
    }

    if (!window.confirm(confirmationMessage(decision, selected))) return;

    setSubmitting(decision);
    setDetailError("");
    try {
      const response = await api.post(`${url}/api/vendor/${selected.id}/review`, {
        decision,
        note: validation.value,
      });
      setSelected(readReviewResult(response.data));
      setNote("");
      toast.success(DECISIONS[decision].success);
      await fetchApplications(page);
    } catch (error) {
      const message = readApiError(error, "Unable to record the review decision");
      setDetailError(message);
      toast.error(message);
      if (error?.response?.status === 409) {
        try {
          const response = await api.get(`${url}/api/vendor/admin/${selected.id}`);
          setSelected(readVendorDetail(response.data));
        } catch {
          // Keep the current detail visible; the conflict message explains the next step.
        }
        await fetchApplications(page);
      }
    } finally {
      setSubmitting("");
    }
  };

  const actions = selected ? decisionsForStatus(selected.status) : [];

  return (
    <div className="vendors">
      <div className="vendors-heading">
        <h2>Vendor applications</h2>
        <p>
          Review businesses that applied to sell through Elevoni. Approval does not verify a
          business, create listings or publish products.
        </p>
      </div>

      <div className="vendors-filters" role="group" aria-label="Filter applications by status">
        {VENDOR_STATUS_FILTERS.map((filter) => (
          <button
            key={filter.value}
            type="button"
            className={`vendors-filter ${status === filter.value ? "active" : ""}`}
            aria-pressed={status === filter.value}
            onClick={() => changeFilter(filter.value)}
          >
            {filter.label}
          </button>
        ))}
      </div>

      <div className="vendors-layout">
        <section className="vendors-list" aria-label={`${statusLabel(status)} vendor applications`}>
          {listLoading && (
            <p className="vendors-state" role="status">
              Loading vendor applications&hellip;
            </p>
          )}

          {!listLoading && listError && (
            <div className="vendors-state vendors-error" role="alert">
              <p>{listError}</p>
              <button type="button" className="vendors-secondary" onClick={() => fetchApplications(page)}>
                Try again
              </button>
            </div>
          )}

          {!listLoading && !listError && applications.length === 0 && (
            <p className="vendors-state">{emptyListMessage(status)}</p>
          )}

          {!listLoading && !listError && applications.length > 0 && (
            <ul className="vendors-items">
              {applications.map((application) => (
                <li
                  key={application.id}
                  className={`vendor-card ${selectedId === application.id ? "selected" : ""}`}
                >
                  <div className="vendor-card-main">
                    <p className="vendor-card-name">{application.businessName}</p>
                    <p className="vendor-card-line">
                      {application.contactName} &middot; {application.phone}
                    </p>
                    <p className="vendor-card-line">
                      {application.location} &middot; {vendorFocusLabel(application.productFocus)}
                    </p>
                    <p className="vendor-card-meta">
                      Submitted {formatSubmittedAt(application.submittedAt)}
                    </p>
                  </div>
                  <div className="vendor-card-side">
                    <span className={statusClass(application.status)}>
                      {statusLabel(application.status)}
                    </span>
                    <button
                      type="button"
                      className="vendors-review"
                      aria-expanded={selectedId === application.id}
                      onClick={() => openApplication(application.id)}
                    >
                      {selectedId === application.id ? "Viewing" : "Review"}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <Pagination pagination={pagination} onPageChange={(nextPage) => fetchApplications(nextPage)} />
        </section>

        <aside className="vendor-detail" aria-live="polite" aria-label="Application details">
          {!selectedId && (
            <p className="vendors-state">Select an application to review its submitted details.</p>
          )}

          {selectedId && detailLoading && (
            <p className="vendors-state" role="status">
              Loading application&hellip;
            </p>
          )}

          {selectedId && !detailLoading && detailError && (
            <div className="vendors-state vendors-error" role="alert">
              <p>{detailError}</p>
              <button type="button" className="vendors-secondary" onClick={() => openApplication(selectedId)}>
                Try again
              </button>
            </div>
          )}

          {selectedId && !detailLoading && !detailError && selected && (
            <div className="vendor-detail-body">
              <div className="vendor-detail-header">
                <div>
                  <h3>{selected.businessName}</h3>
                  <span className={statusClass(selected.status)}>{statusLabel(selected.status)}</span>
                </div>
                <button type="button" className="vendors-secondary" onClick={closeApplication}>
                  Close
                </button>
              </div>

              <p className="vendor-detail-note">{statusNote(selected.status)}</p>

              {selected.status !== status && (
                <p className="vendor-detail-hint">
                  This application no longer matches the &ldquo;{statusLabel(status)}&rdquo; filter.
                </p>
              )}

              <dl className="vendor-detail-fields">
                <div>
                  <dt>Contact name</dt>
                  <dd>{selected.contactName}</dd>
                </div>
                <div>
                  <dt>Email</dt>
                  <dd>{selected.email}</dd>
                </div>
                <div>
                  <dt>Phone</dt>
                  <dd>{selected.phone}</dd>
                </div>
                <div>
                  <dt>Location</dt>
                  <dd>{selected.location}</dd>
                </div>
                <div>
                  <dt>Livestock focus</dt>
                  <dd>{vendorFocusLabel(selected.productFocus)}</dd>
                </div>
                <div>
                  <dt>Submitted</dt>
                  <dd>{formatSubmittedAt(selected.submittedAt)}</dd>
                </div>
                <div>
                  <dt>Last reviewed</dt>
                  <dd>{selected.reviewedAt ? formatSubmittedAt(selected.reviewedAt) : "Not reviewed"}</dd>
                </div>
                <div className="wide">
                  <dt>Business description</dt>
                  <dd>{selected.description || "Not provided"}</dd>
                </div>
                {selected.decisionNote && (
                  <div className="wide">
                    <dt>Latest internal note</dt>
                    <dd>{selected.decisionNote}</dd>
                  </div>
                )}
              </dl>

              {actions.length > 0 ? (
                <div className="vendor-review">
                  <label htmlFor="vendor-review-note">
                    Internal review note (not shown to the applicant)
                  </label>
                  <textarea
                    id="vendor-review-note"
                    value={note}
                    rows={3}
                    maxLength={MAX_REVIEW_NOTE_LENGTH}
                    placeholder="Optional context for this decision"
                    disabled={Boolean(submitting)}
                    onChange={(event) => setNote(event.target.value)}
                  />
                  <p className="vendor-note-count">
                    {note.length}/{MAX_REVIEW_NOTE_LENGTH}
                  </p>
                  <div className="vendor-review-actions">
                    {actions.map((action) => (
                      <button
                        key={action.decision}
                        type="button"
                        className={`vendors-action ${action.tone}`}
                        disabled={Boolean(submitting)}
                        onClick={() => submitDecision(action.decision)}
                      >
                        {submitting === action.decision ? "Saving\u2026" : action.label}
                      </button>
                    ))}
                  </div>
                  <p className="vendor-review-hint">
                    You will be asked to confirm before the decision is recorded.
                  </p>
                </div>
              ) : (
                <p className="vendor-review-terminal">
                  No actions are available for a rejected application in this release.
                  Reconsideration requires an administrator to reopen it.
                </p>
              )}

              <div className="vendor-history">
                <h4>Status history</h4>
                <ul>
                  {(selected.statusHistory || []).map((entry, index) => (
                    <li key={`${entry.status}-${index}`}>
                      <span className="vendor-history-status">{statusLabel(entry.status)}</span>
                      <span className="vendor-history-date">{formatSubmittedAt(entry.at)}</span>
                      {entry.note && <span className="vendor-history-note">{entry.note}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
};

export default Vendors;
