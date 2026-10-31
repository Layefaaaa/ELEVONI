import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";

import api from "../../api";
import { AuthContext } from "../../context/auth-context";
import "./SalesLog.css";

const PRODUCT_UNITS = [
    "kg",
    "gram",
    "piece",
    "crate",
    "ton",
    "bag",
    "carton",
    "litre",
];

const SALES_CHANNELS = [
    { value: "phone", label: "Phone call" },
    { value: "whatsapp", label: "WhatsApp" },
    { value: "in_person", label: "In person" },
    { value: "other", label: "Other" },
];

const PAYMENT_STATUSES = [
    { value: "paid", label: "Paid in full" },
    { value: "partial", label: "Part payment" },
    { value: "unpaid", label: "Unpaid" },
];

const FULFILMENT_STATUSES = [
    { value: "pending", label: "Not yet fulfilled" },
    { value: "fulfilled", label: "Fulfilled" },
    { value: "cancelled", label: "Cancelled" },
];

const PRODUCT_STATUS_LABELS = {
    pending: "Under review",
    approved: "Approved",
    rejected: "Rejected",
};

const roundMoney = (value) =>
    Math.round((value + Number.EPSILON) * 100) / 100;

const formatMoney = (value) =>
    `₦${Number(value || 0).toLocaleString("en-NG", {
        maximumFractionDigits: 2,
    })}`;

const formatDate = (value) => {
    if (!value) {
        return "Date not recorded";
    }

    const date =
        typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)
            ? new Date(`${value.slice(0, 10)}T12:00:00`)
            : new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "Date not recorded";
    }

    return date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
};

const todayInputValue = () => new Date().toISOString().slice(0, 10);

const newSubmissionReference = () => {
    if (
        typeof crypto !== "undefined" &&
        typeof crypto.randomUUID === "function"
    ) {
        return `sale-${crypto.randomUUID()}`;
    }

    return `sale-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

const createBlankForm = () => ({
    productType: "listed",
    productId: "",
    productName: "",
    unit: "kg",
    quantity: "",
    unitPrice: "",
    saleDate: todayInputValue(),
    saleTime: "",
    salesChannel: "phone",
    paymentStatus: "paid",
    amountReceived: "",
    fulfilmentStatus: "pending",
    buyerIdentityStatus: "identified",
    buyerName: "",
    buyerContact: "",
    buyerState: "",
    buyerArea: "",
    notes: "",
});

const applicationStatusLabel = (status) =>
    ({
        pending: "Under review",
        approved: "Approved",
        rejected: "Rejected",
        suspended: "Suspended",
    }[status] ||
        status ||
        "Unknown");

const applicationMessage = (status) => {
    if (status === "pending") {
        return "Your application is awaiting review. Sales recording becomes available after approval.";
    }

    if (status === "rejected") {
        return "Your application was not approved. Review the application page for the current status and next steps.";
    }

    if (status === "suspended") {
        return "Vendor tools are paused while this profile is suspended. Contact Elevoni for clarification.";
    }

    return "Submit your business details to start the vendor review process.";
};

const paymentStatusLabel = (status) =>
    PAYMENT_STATUSES.find((item) => item.value === status)?.label ||
    status ||
    "Unknown";

const fulfilmentStatusLabel = (status) =>
    FULFILMENT_STATUSES.find((item) => item.value === status)?.label ||
    status ||
    "Unknown";

const channelLabel = (channel) =>
    SALES_CHANNELS.find((item) => item.value === channel)?.label ||
    channel ||
    "Unknown";

const productStatusLabel = (status) =>
    PRODUCT_STATUS_LABELS[status] || status || "Unknown";

const FieldError = ({ id, message }) =>
    message ? (
        <p className="sales-field-error" id={id}>
            {message}
        </p>
    ) : null;

const SalesLog = () => {
    const {
        isAuthenticated,
        application,
        loading: sessionLoading,
    } = useContext(AuthContext);

    const [products, setProducts] = useState([]);
    const [productsLoading, setProductsLoading] = useState(false);
    const [productsError, setProductsError] = useState("");

    const [sales, setSales] = useState([]);
    const [salesLoading, setSalesLoading] = useState(false);
    const [salesError, setSalesError] = useState("");
    const [pagination, setPagination] = useState(null);
    const [page, setPage] = useState(1);
    const [refresh, setRefresh] = useState(0);

    const [form, setForm] = useState(createBlankForm);
    const [submissionReference, setSubmissionReference] = useState(
        newSubmissionReference,
    );
    const [fieldErrors, setFieldErrors] = useState({});
    const [formError, setFormError] = useState("");
    const [saving, setSaving] = useState(false);

    const [successTitle, setSuccessTitle] = useState("");
    const [successMessage, setSuccessMessage] = useState("");
    const [savedSale, setSavedSale] = useState(null);

    const today = todayInputValue();

    const selectedProduct = useMemo(
        () =>
            products.find(
                (product) => String(product._id) === String(form.productId),
            ) || null,
        [products, form.productId],
    );

    const selectedUnit =
        form.productType === "listed"
            ? selectedProduct?.unitOfMeasure || "unit"
            : form.unit;

    const totalAmount = useMemo(() => {
        const quantity = Number(form.quantity);
        const unitPrice = Number(form.unitPrice);

        if (
            !Number.isFinite(quantity) ||
            quantity <= 0 ||
            !Number.isFinite(unitPrice) ||
            unitPrice <= 0
        ) {
            return 0;
        }

        return roundMoney(quantity * unitPrice);
    }, [form.quantity, form.unitPrice]);

    const amountReceived = useMemo(() => {
        if (form.paymentStatus === "paid") {
            return totalAmount;
        }

        if (form.paymentStatus === "unpaid") {
            return 0;
        }

        return roundMoney(Number(form.amountReceived) || 0);
    }, [form.amountReceived, form.paymentStatus, totalAmount]);

    const balanceDue = Math.max(totalAmount - amountReceived, 0);

    const loadProducts = useCallback(async () => {
        if (!isAuthenticated || application?.status !== "approved") {
            setProducts([]);
            setProductsLoading(false);
            setProductsError("");
            return;
        }

        setProductsLoading(true);
        setProductsError("");

        try {
            const response = await api.get("/api/products/vendor/me");
            setProducts(
                Array.isArray(response.data?.data)
                    ? response.data.data
                    : [],
            );
        } catch (error) {
            setProductsError(
                error.response?.data?.message ||
                    "Unable to load your product listings.",
            );
        } finally {
            setProductsLoading(false);
        }
    }, [application?.status, isAuthenticated]);

    const loadSales = useCallback(
        async (targetPage) => {
            if (!isAuthenticated || application?.status !== "approved") {
                setSales([]);
                setPagination(null);
                setSalesLoading(false);
                setSalesError("");
                return;
            }

            setSalesLoading(true);
            setSalesError("");

            try {
                const response = await api.get("/api/vendor/sales", {
                    params: { page: targetPage, limit: 20 },
                });

                if (!response.data?.success) {
                    throw new Error(
                        response.data?.message ||
                            "Unable to load your sales history.",
                    );
                }

                setSales(
                    Array.isArray(response.data.data)
                        ? response.data.data
                        : [],
                );
                setPagination(response.data.pagination || null);
            } catch (error) {
                setSalesError(
                    error.response?.data?.message ||
                        error.message ||
                        "Unable to load your sales history.",
                );
            } finally {
                setSalesLoading(false);
            }
        },
        [application?.status, isAuthenticated],
    );

    useEffect(() => {
        const timer = window.setTimeout(() => {
            loadProducts();
        }, 0);

        return () => window.clearTimeout(timer);
    }, [loadProducts]);

    useEffect(() => {
        const timer = window.setTimeout(() => {
            loadSales(page);
        }, 0);

        return () => window.clearTimeout(timer);
    }, [loadSales, page, refresh]);

    const clearFieldError = (name) => {
        setFieldErrors((current) => {
            if (!current[name]) {
                return current;
            }

            const next = { ...current };
            delete next[name];
            return next;
        });

        if (formError) {
            setFormError("");
        }
    };

    const updateField = (event) => {
        const { name, value } = event.target;

        setForm((current) => ({
            ...current,
            [name]: value,
        }));

        clearFieldError(name);
    };

    const handleProductTypeChange = (event) => {
        const productType = event.target.value;

        setForm((current) => ({
            ...current,
            productType,
            productId: productType === "listed" ? current.productId : "",
            productName:
                productType === "unlisted" ? current.productName : "",
        }));

        setFieldErrors({});
        setFormError("");
    };

    const handleProductChange = (event) => {
        const productId = event.target.value;
        const product =
            products.find(
                (item) => String(item._id) === String(productId),
            ) || null;

        setForm((current) => ({
            ...current,
            productId,
            unitPrice:
                product && Number(product.price) > 0
                    ? String(product.price)
                    : "",
        }));

        clearFieldError("productId");
        clearFieldError("unitPrice");
    };

    const handlePaymentStatusChange = (event) => {
        const paymentStatus = event.target.value;

        setForm((current) => ({
            ...current,
            paymentStatus,
            amountReceived:
                paymentStatus === "partial"
                    ? current.amountReceived
                    : "",
        }));

        clearFieldError("amountReceived");
    };

    const resetForm = () => {
        setForm(createBlankForm());
        setSubmissionReference(newSubmissionReference());
        setFieldErrors({});
        setFormError("");
    };

    const validateForm = () => {
        const errors = {};

        if (form.productType === "listed") {
            if (!form.productId) {
                errors.productId = "Choose one of your listed products.";
            }
        } else {
            if (form.productName.trim().length < 2) {
                errors.productName =
                    "Enter the product name (at least 2 characters).";
            }

            if (!PRODUCT_UNITS.includes(form.unit)) {
                errors.unit = "Choose a valid unit.";
            }
        }

        const quantity = Number(form.quantity);

        if (!Number.isFinite(quantity) || quantity <= 0) {
            errors.quantity = "Enter a quantity greater than zero.";
        }

        const unitPrice = Number(form.unitPrice);

        if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
            errors.unitPrice = "Enter a unit price greater than zero.";
        }

        if (!form.saleDate) {
            errors.saleDate = "Choose the sale date.";
        } else if (form.saleDate > today) {
            errors.saleDate = "The sale date cannot be in the future.";
        }

        if (form.paymentStatus === "partial") {
            const amount = roundMoney(Number(form.amountReceived));

            if (!Number.isFinite(amount) || amount <= 0) {
                errors.amountReceived =
                    "Enter the amount received so far.";
            } else if (amount >= totalAmount) {
                errors.amountReceived =
                    "A part payment must be less than the sale total.";
            }
        }

        if (form.saleTime && !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(form.saleTime)) {
            errors.saleTime = "Enter the time in HH:MM format.";
        }

        if (form.buyerIdentityStatus === "identified" && !form.buyerName.trim() && !form.buyerContact.trim()) {
            errors.buyerName = "For an identified buyer, enter a name or contact detail.";
        }

        if (form.buyerIdentityStatus === "anonymous" && (form.buyerName.trim() || form.buyerContact.trim())) {
            errors.buyerIdentityStatus = "Clear buyer name and contact for anonymous sales.";
        }

        if (form.buyerName.trim().length > 120) {
            errors.buyerName = "Buyer name must be 120 characters or fewer.";
        }

        if (form.buyerContact.trim().length > 120) {
            errors.buyerContact =
                "Buyer contact must be 120 characters or fewer.";
        }

        if (form.buyerState.trim().length > 100) errors.buyerState = "Buyer state must be 100 characters or fewer.";
        if (form.buyerArea.trim().length > 120) errors.buyerArea = "Buyer area or town must be 120 characters or fewer.";

        if (form.notes.trim().length > 1000) {
            errors.notes = "Notes must be 1,000 characters or fewer.";
        }

        return errors;
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (saving) {
            return;
        }

        const errors = validateForm();

        if (Object.keys(errors).length > 0) {
            setFieldErrors(errors);
            setFormError("Please check the highlighted fields and try again.");
            toast.error("Please check the highlighted fields.");
            window.requestAnimationFrame(() => {
                document
                    .querySelector(".sales-log [aria-invalid='true']")
                    ?.focus();
            });
            return;
        }

        setFieldErrors({});
        setFormError("");
        setSaving(true);

        const payload = {
            submissionReference,
            quantity: Number(form.quantity),
            unitPrice: Number(form.unitPrice),
            saleDate: form.saleDate,
            saleTime: form.saleTime,
            salesChannel: form.salesChannel,
            paymentStatus: form.paymentStatus,
            amountReceived,
            fulfilmentStatus: form.fulfilmentStatus,
            buyerIdentityStatus: form.buyerIdentityStatus,
            buyerName: form.buyerName.trim(),
            buyerContact: form.buyerContact.trim(),
            buyerState: form.buyerState.trim(),
            buyerArea: form.buyerArea.trim(),
            notes: form.notes.trim(),
        };

        if (form.productType === "listed") {
            payload.productId = form.productId;
        } else {
            payload.productName = form.productName.trim();
            payload.unit = form.unit;
        }

        try {
            const response = await api.post("/api/vendor/sales", payload);

            if (!response.data?.success) {
                throw new Error(
                    response.data?.message || "Unable to record this sale.",
                );
            }

            setSavedSale(response.data.data || null);
            setSuccessTitle("Sale recorded");
            setSuccessMessage(
                response.data.message ||
                    "The sale has been saved as a farmer-reported record.",
            );

            resetForm();
            setPage(1);
            setRefresh((value) => value + 1);
            toast.success("Sale recorded.");
        } catch (error) {
            if (
                error.response?.status === 409 &&
                error.response?.data?.duplicate
            ) {
                const message =
                    error.response.data.message ||
                    "This sale has already been submitted.";

                setSavedSale(null);
                setSuccessTitle("Sale already recorded");
                setSuccessMessage(
                    "This sale was already recorded. Your history has been refreshed.",
                );

                resetForm();
                setPage(1);
                setRefresh((value) => value + 1);
                toast.info(message);
                return;
            }

            const message =
                error.response?.data?.message ||
                error.message ||
                "Unable to record this sale. Please try again.";

            setFormError(message);
            toast.error(message);

            window.requestAnimationFrame(() => {
                document.getElementById("sales-form-error")?.focus();
            });
        } finally {
            setSaving(false);
        }
    };

    const handleRecordAnother = () => {
        setSuccessTitle("");
        setSuccessMessage("");
        setSavedSale(null);
        resetForm();

        window.requestAnimationFrame(() => {
            document
                .getElementById("sale-product-type-listed")
                ?.focus();
            document
                .querySelector(".sales-log-form-card")
                ?.scrollIntoView({ behavior: "smooth", block: "start" });
        });
    };

    const header = (
        <header className="sales-log-header">
            <p className="sales-eyebrow">Sales log</p>
            <h1>Record the sales you already made</h1>
            <p className="sales-log-summary">
                Keep a simple record of sales made by phone, WhatsApp or in
                person. These entries are farmer-reported and start as
                unverified. They are not platform orders and do not confirm
                delivery.
            </p>
        </header>
    );

    if (sessionLoading) {
        return (
            <section className="sales-log">
                <p className="sales-state" role="status">
                    Checking your account…
                </p>
            </section>
        );
    }

    if (!isAuthenticated) {
        return (
            <section className="sales-log">
                {header}

                <div className="sales-state sales-state-notice">
                    <h2>Sign in to record sales</h2>
                    <p>
                        Use your Elevoni account to record offline sales and
                        view your sales history.
                    </p>
                    <Link className="sales-link" to="/login">
                        Sign in →
                    </Link>
                </div>
            </section>
        );
    }

    if (!application || application.status !== "approved") {
        return (
            <section className="sales-log">
                {header}

                <div className="sales-state sales-state-notice">
                    <p className="sales-eyebrow">Application status</p>
                    <h2>
                        {application
                            ? applicationStatusLabel(application.status)
                            : "No vendor application found"}
                    </h2>
                    <p>{applicationMessage(application?.status)}</p>
                    <Link className="sales-link" to="/apply">
                        View application →
                    </Link>
                </div>
            </section>
        );
    }

    const totalPages = pagination?.totalPages || 0;
    const currentPage = pagination?.page || page;
    const totalSales = pagination?.total ?? sales.length;

    return (
        <section className="sales-log">
            {header}

            {successMessage && (
                <div
                    className="sales-success"
                    role="status"
                    aria-live="polite"
                >
                    <div>
                        <h2>{successTitle || "Sale recorded"}</h2>
                        <p>{successMessage}</p>
                        {savedSale && (
                            <p className="sales-success-detail">
                                {savedSale.productName} ·{" "}
                                {formatMoney(savedSale.totalAmount)}
                            </p>
                        )}
                    </div>
                    <button
                        type="button"
                        className="sales-secondary"
                        onClick={handleRecordAnother}
                    >
                        Record another sale
                    </button>
                </div>
            )}

            <div className="sales-log-grid">
                <section className="sales-card sales-log-form-card">
                    <div className="sales-card-heading">
                        <div>
                            <p className="sales-eyebrow">New record</p>
                            <h2>Sale details</h2>
                        </div>
                    </div>

                    <form
                        className="sales-form"
                        onSubmit={handleSubmit}
                        noValidate
                    >
                        {formError && (
                            <div
                                className="sales-form-error"
                                id="sales-form-error"
                                role="alert"
                                tabIndex="-1"
                            >
                                {formError}
                            </div>
                        )}

                        <fieldset className="sales-field sales-choice">
                            <legend>
                                Is this product in your Elevoni listings?
                            </legend>

                            <div className="sales-choice-grid">
                                <label
                                    className={`sales-choice-option ${
                                        form.productType === "listed"
                                            ? "is-selected"
                                            : ""
                                    }`}
                                >
                                    <input
                                        id="sale-product-type-listed"
                                        type="radio"
                                        name="productType"
                                        value="listed"
                                        checked={
                                            form.productType === "listed"
                                        }
                                        onChange={handleProductTypeChange}
                                    />
                                    <span>
                                        <strong>Yes, it is listed</strong>
                                        <small>
                                            Choose from your product listings.
                                        </small>
                                    </span>
                                </label>

                                <label
                                    className={`sales-choice-option ${
                                        form.productType === "unlisted"
                                            ? "is-selected"
                                            : ""
                                    }`}
                                >
                                    <input
                                        id="sale-product-type-unlisted"
                                        type="radio"
                                        name="productType"
                                        value="unlisted"
                                        checked={
                                            form.productType === "unlisted"
                                        }
                                        onChange={handleProductTypeChange}
                                    />
                                    <span>
                                        <strong>No, it is not listed</strong>
                                        <small>
                                            Enter the product name and unit.
                                        </small>
                                    </span>
                                </label>
                            </div>
                        </fieldset>

                        {form.productType === "listed" ? (
                            <>
                                <div className="sales-field">
                                    <label htmlFor="sale-product">
                                        Listed product
                                    </label>

                                    <select
                                        id="sale-product"
                                        name="productId"
                                        value={form.productId}
                                        onChange={handleProductChange}
                                        aria-invalid={Boolean(
                                            fieldErrors.productId,
                                        )}
                                        aria-describedby={
                                            fieldErrors.productId
                                                ? "sale-product-error"
                                                : undefined
                                        }
                                    >
                                        <option value="">
                                            Choose a product
                                        </option>
                                        {products.map((product) => (
                                            <option
                                                key={product._id}
                                                value={product._id}
                                            >
                                                {product.name} —{" "}
                                                {product.unitOfMeasure ||
                                                    "unit"}{" "}
                                                (
                                                {productStatusLabel(
                                                    product.status,
                                                )}
                                                )
                                            </option>
                                        ))}
                                    </select>

                                    {productsLoading && (
                                        <p
                                            className="sales-field-note"
                                            role="status"
                                        >
                                            Loading your listings…
                                        </p>
                                    )}

                                    {!productsLoading && productsError && (
                                        <div
                                            className="sales-field-error"
                                            role="alert"
                                        >
                                            {productsError}{" "}
                                            <button
                                                type="button"
                                                className="sales-inline-button"
                                                onClick={loadProducts}
                                            >
                                                Try again
                                            </button>
                                        </div>
                                    )}

                                    {!productsLoading &&
                                        !productsError &&
                                        products.length === 0 && (
                                            <p className="sales-field-note">
                                                No listings found. Choose “No,
                                                it is not listed” to record an
                                                unlisted product.
                                            </p>
                                        )}

                                    <FieldError
                                        id="sale-product-error"
                                        message={fieldErrors.productId}
                                    />

                                    {selectedProduct && (
                                        <div className="sales-selected-product">
                                            <strong>
                                                {selectedProduct.name}
                                            </strong>
                                            <span>
                                                {selectedProduct.unitOfMeasure ||
                                                    "unit"}{" "}
                                                ·{" "}
                                                {productStatusLabel(
                                                    selectedProduct.status,
                                                )}
                                                {Number(
                                                    selectedProduct.price,
                                                ) > 0
                                                    ? ` · Suggested price ${formatMoney(
                                                          selectedProduct.price,
                                                      )}`
                                                    : ""}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="sales-field">
                                    <label htmlFor="sale-product-name">
                                        Product name
                                    </label>
                                    <input
                                        id="sale-product-name"
                                        name="productName"
                                        value={form.productName}
                                        onChange={updateField}
                                        maxLength={160}
                                        aria-invalid={Boolean(
                                            fieldErrors.productName,
                                        )}
                                        aria-describedby={
                                            fieldErrors.productName
                                                ? "sale-product-name-error"
                                                : undefined
                                        }
                                        placeholder="e.g. Fresh tomatoes"
                                    />
                                    <FieldError
                                        id="sale-product-name-error"
                                        message={fieldErrors.productName}
                                    />
                                </div>

                                <div className="sales-field">
                                    <label htmlFor="sale-unit">Unit</label>
                                    <select
                                        id="sale-unit"
                                        name="unit"
                                        value={form.unit}
                                        onChange={updateField}
                                        aria-invalid={Boolean(
                                            fieldErrors.unit,
                                        )}
                                        aria-describedby={
                                            fieldErrors.unit
                                                ? "sale-unit-error"
                                                : undefined
                                        }
                                    >
                                        {PRODUCT_UNITS.map((unit) => (
                                            <option key={unit} value={unit}>
                                                {unit}
                                            </option>
                                        ))}
                                    </select>
                                    <FieldError
                                        id="sale-unit-error"
                                        message={fieldErrors.unit}
                                    />
                                </div>
                            </>
                        )}

                        <div className="sales-form-row">
                            <div className="sales-field">
                                <label htmlFor="sale-quantity">
                                    Quantity ({selectedUnit})
                                </label>
                                <input
                                    id="sale-quantity"
                                    name="quantity"
                                    type="number"
                                    inputMode="decimal"
                                    min="0"
                                    step="any"
                                    value={form.quantity}
                                    onChange={updateField}
                                    aria-invalid={Boolean(
                                        fieldErrors.quantity,
                                    )}
                                    aria-describedby={
                                        fieldErrors.quantity
                                            ? "sale-quantity-error"
                                            : undefined
                                    }
                                    placeholder="e.g. 10"
                                />
                                <FieldError
                                    id="sale-quantity-error"
                                    message={fieldErrors.quantity}
                                />
                            </div>

                            <div className="sales-field">
                                <label htmlFor="sale-unit-price">
                                    Actual sale price (₦ per{" "}
                                    {selectedUnit})
                                </label>
                                <input
                                    id="sale-unit-price"
                                    name="unitPrice"
                                    type="number"
                                    inputMode="decimal"
                                    min="0"
                                    step="0.01"
                                    value={form.unitPrice}
                                    onChange={updateField}
                                    aria-invalid={Boolean(
                                        fieldErrors.unitPrice,
                                    )}
                                    aria-describedby={
                                        fieldErrors.unitPrice
                                            ? "sale-unit-price-error"
                                            : undefined
                                    }
                                    placeholder="e.g. 2500"
                                />
                                <FieldError
                                    id="sale-unit-price-error"
                                    message={fieldErrors.unitPrice}
                                />
                            </div>
                        </div>

                        <div className="sales-form-row">
                            <div className="sales-field">
                                <label htmlFor="sale-date">
                                    Sale date
                                </label>
                                <input
                                    id="sale-date"
                                    name="saleDate"
                                    type="date"
                                    max={today}
                                    value={form.saleDate}
                                    onChange={updateField}
                                    aria-invalid={Boolean(
                                        fieldErrors.saleDate,
                                    )}
                                    aria-describedby={
                                        fieldErrors.saleDate
                                            ? "sale-date-error"
                                            : undefined
                                    }
                                />
                                <FieldError
                                    id="sale-date-error"
                                    message={fieldErrors.saleDate}
                                />
                            </div>

                            <div className="sales-field">
                                <label htmlFor="sale-time">Sale time (optional)</label>
                                <input id="sale-time" name="saleTime" type="time" value={form.saleTime} onChange={updateField} aria-invalid={Boolean(fieldErrors.saleTime)} />
                                <FieldError id="sale-time-error" message={fieldErrors.saleTime} />
                            </div>
                            <div className="sales-field">
                                <label htmlFor="sale-channel">
                                    Sales channel
                                </label>
                                <select
                                    id="sale-channel"
                                    name="salesChannel"
                                    value={form.salesChannel}
                                    onChange={updateField}
                                >
                                    {SALES_CHANNELS.map((channel) => (
                                        <option
                                            key={channel.value}
                                            value={channel.value}
                                        >
                                            {channel.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="sales-form-row">
                            <div className="sales-field">
                                <label htmlFor="sale-payment-status">
                                    Payment status
                                </label>
                                <select
                                    id="sale-payment-status"
                                    name="paymentStatus"
                                    value={form.paymentStatus}
                                    onChange={handlePaymentStatusChange}
                                >
                                    {PAYMENT_STATUSES.map((status) => (
                                        <option
                                            key={status.value}
                                            value={status.value}
                                        >
                                            {status.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="sales-field">
                                <label htmlFor="sale-amount-received">
                                    Amount received (₦)
                                </label>
                                <input
                                    id="sale-amount-received"
                                    name="amountReceived"
                                    type="number"
                                    inputMode="decimal"
                                    min="0"
                                    step="0.01"
                                    value={
                                        form.paymentStatus === "partial"
                                            ? form.amountReceived
                                            : amountReceived
                                    }
                                    onChange={updateField}
                                    disabled={
                                        form.paymentStatus !== "partial"
                                    }
                                    aria-invalid={Boolean(
                                        fieldErrors.amountReceived,
                                    )}
                                    aria-describedby={
                                        fieldErrors.amountReceived
                                            ? "sale-amount-received-error"
                                            : undefined
                                    }
                                />
                                <p className="sales-field-note">
                                    {form.paymentStatus === "paid"
                                        ? "The full sale total is recorded as received."
                                        : form.paymentStatus === "unpaid"
                                          ? "No payment is recorded as received."
                                          : "Enter the amount received so far. It must be less than the total."}
                                </p>
                                <FieldError
                                    id="sale-amount-received-error"
                                    message={fieldErrors.amountReceived}
                                />
                            </div>
                        </div>

                        <div className="sales-field">
                            <label htmlFor="sale-fulfilment-status">
                                Fulfilment status
                            </label>
                            <select
                                id="sale-fulfilment-status"
                                name="fulfilmentStatus"
                                value={form.fulfilmentStatus}
                                onChange={updateField}
                            >
                                {FULFILMENT_STATUSES.map((status) => (
                                    <option
                                        key={status.value}
                                        value={status.value}
                                    >
                                        {status.label}
                                    </option>
                                ))}
                            </select>
                            <p className="sales-field-note">
                                Payment and fulfilment are separate. Recording
                                payment does not mark the sale as fulfilled.
                            </p>
                        </div>

                        <div className="sales-total-card" aria-live="polite">
                            <div className="sales-total-row">
                                <span>Sale total</span>
                                <strong>{formatMoney(totalAmount)}</strong>
                            </div>
                            <div className="sales-total-row">
                                <span>Amount received</span>
                                <strong>{formatMoney(amountReceived)}</strong>
                            </div>
                            <div className="sales-total-row">
                                <span>Balance due</span>
                                <strong>{formatMoney(balanceDue)}</strong>
                            </div>
                            <p className="sales-total-note">
                                Preview only. Elevoni calculates and stores
                                the final amounts on the server.
                            </p>
                        </div>

                        <details className="sales-details">
                            <summary>Add more details (optional)</summary>

                            <div className="sales-details-body">
                                <div className="sales-field">
                                    <label htmlFor="sale-buyer-identity">Buyer identification</label>
                                    <select id="sale-buyer-identity" name="buyerIdentityStatus" value={form.buyerIdentityStatus} onChange={(event) => {
                                        const value = event.target.value;
                                        setForm((current) => ({ ...current, buyerIdentityStatus: value, ...(value === "anonymous" ? { buyerName: "", buyerContact: "" } : {}) }));
                                        clearFieldError("buyerIdentityStatus");
                                    }}>
                                        <option value="identified">Identified buyer</option>
                                        <option value="anonymous">Anonymous buyer</option>
                                        <option value="unknown">Identity unknown</option>
                                    </select>
                                    <p className="sales-field-note">For identified buyers, enter a name or contact so repeat purchases can be matched. Do not invent missing details.</p>
                                    <FieldError id="sale-buyer-identity-error" message={fieldErrors.buyerIdentityStatus} />
                                </div>
                                <div className="sales-form-row">
                                    <div className="sales-field">
                                        <label htmlFor="sale-buyer-name">
                                            Buyer name
                                        </label>
                                        <input
                                            id="sale-buyer-name"
                                            name="buyerName"
                                            value={form.buyerName}
                                            onChange={updateField}
                                            maxLength={120}
                                            autoComplete="name"
                                            aria-invalid={Boolean(
                                                fieldErrors.buyerName,
                                            )}
                                            aria-describedby={
                                                fieldErrors.buyerName
                                                    ? "sale-buyer-name-error"
                                                    : undefined
                                            }
                                        />
                                        <FieldError
                                            id="sale-buyer-name-error"
                                            message={fieldErrors.buyerName}
                                        />
                                    </div>

                                    <div className="sales-field">
                                        <label htmlFor="sale-buyer-contact">
                                            Buyer phone or contact
                                        </label>
                                        <input
                                            id="sale-buyer-contact"
                                            name="buyerContact"
                                            value={form.buyerContact}
                                            onChange={updateField}
                                            maxLength={120}
                                            autoComplete="tel"
                                            aria-invalid={Boolean(
                                                fieldErrors.buyerContact,
                                            )}
                                            aria-describedby={
                                                fieldErrors.buyerContact
                                                    ? "sale-buyer-contact-error"
                                                    : undefined
                                            }
                                        />
                                        <FieldError
                                            id="sale-buyer-contact-error"
                                            message={fieldErrors.buyerContact}
                                        />
                                    </div>
                                </div>

                                <div className="sales-form-row">
                                    <div className="sales-field">
                                        <label htmlFor="sale-buyer-state">
                                            Buyer state
                                        </label>
                                        <input
                                            id="sale-buyer-state"
                                            name="buyerState"
                                            value={form.buyerState}
                                            onChange={updateField}
                                            maxLength={100}
                                            autoComplete="address-level1"
                                            placeholder="e.g. FCT"
                                            aria-invalid={Boolean(
                                                fieldErrors.buyerState,
                                            )}
                                            aria-describedby={
                                                fieldErrors.buyerState
                                                    ? "sale-buyer-state-error"
                                                    : undefined
                                            }
                                        />
                                        <FieldError
                                            id="sale-buyer-state-error"
                                            message={fieldErrors.buyerState}
                                        />
                                    </div>
                                    <div className="sales-field">
                                        <label htmlFor="sale-buyer-area">
                                            Buyer area / town
                                        </label>
                                        <input
                                            id="sale-buyer-area"
                                            name="buyerArea"
                                            value={form.buyerArea}
                                            onChange={updateField}
                                            maxLength={120}
                                            autoComplete="address-level2"
                                            placeholder="e.g. Gwarinpa"
                                            aria-invalid={Boolean(
                                                fieldErrors.buyerArea,
                                            )}
                                            aria-describedby={
                                                fieldErrors.buyerArea
                                                    ? "sale-buyer-area-error"
                                                    : undefined
                                            }
                                        />
                                        <FieldError
                                            id="sale-buyer-area-error"
                                            message={fieldErrors.buyerArea}
                                        />
                                    </div>
                                </div>
                                <p className="sales-field-note">
                                    Optional. Use a state and town or area only;
                                    do not enter a full street address.
                                </p>
                                <div className="sales-field">
                                    <label htmlFor="sale-notes">Notes</label>
                                    <textarea
                                        id="sale-notes"
                                        name="notes"
                                        rows="4"
                                        value={form.notes}
                                        onChange={updateField}
                                        maxLength={1000}
                                        aria-invalid={Boolean(
                                            fieldErrors.notes,
                                        )}
                                        aria-describedby={
                                            fieldErrors.notes
                                                ? "sale-notes-error"
                                                : undefined
                                        }
                                        placeholder="Anything useful about this sale"
                                    />
                                    <FieldError
                                        id="sale-notes-error"
                                        message={fieldErrors.notes}
                                    />
                                </div>
                            </div>
                        </details>

                        <button
                            type="submit"
                            className="sales-submit"
                            disabled={saving}
                        >
                            {saving ? "Saving sale…" : "Record sale"}
                        </button>

                        <p className="sales-form-note">
                            This creates a farmer-reported, unverified sale
                            record. It does not create a platform order or
                            confirm delivery.
                        </p>
                    </form>
                </section>

                <section
                    className="sales-card sales-history"
                    aria-labelledby="sales-history-title"
                >
                    <div className="sales-card-heading">
                        <div>
                            <p className="sales-eyebrow">Sales history</p>
                            <h2 id="sales-history-title">Recent sales</h2>
                        </div>

                        <button
                            type="button"
                            className="sales-secondary"
                            onClick={() =>
                                setRefresh((value) => value + 1)
                            }
                            disabled={salesLoading}
                        >
                            Refresh
                        </button>
                    </div>

                    <p className="sales-provenance-note">
                        Farmer-reported, unverified sales. These records are
                        not platform orders.
                    </p>

                    {salesLoading && (
                        <p className="sales-state" role="status">
                            Loading your sales…
                        </p>
                    )}

                    {!salesLoading && salesError && (
                        <div
                            className="sales-state sales-state-error"
                            role="alert"
                        >
                            <p>{salesError}</p>
                            <button
                                type="button"
                                className="sales-secondary"
                                onClick={() =>
                                    setRefresh((value) => value + 1)
                                }
                            >
                                Try again
                            </button>
                        </div>
                    )}

                    {!salesLoading &&
                        !salesError &&
                        sales.length === 0 && (
                            <div className="sales-state">
                                <h3>No sales recorded yet</h3>
                                <p>
                                    Use the form to record your first offline
                                    sale.
                                </p>
                            </div>
                        )}

                    {!salesLoading &&
                        !salesError &&
                        sales.length > 0 && (
                            <>
                                <div className="sales-history-list">
                                    {sales.map((sale) => {
                                        const saleBalance = Math.max(
                                            Number(sale.totalAmount || 0) -
                                                Number(
                                                    sale.amountReceived || 0,
                                                ),
                                            0,
                                        );

                                        return (
                                            <article
                                                className="sales-history-item"
                                                key={sale._id}
                                            >
                                                <div className="sales-history-top">
                                                    <div>
                                                        <h3>
                                                            {sale.productName}
                                                        </h3>
                                                        <p>
                                                            {formatDate(
                                                                sale.saleDate,
                                                            )}{" "}
                                                            ·{" "}
                                                            {Number(
                                                                sale.quantity,
                                                            ).toLocaleString(
                                                                "en-NG",
                                                                {
                                                                    maximumFractionDigits: 3,
                                                                },
                                                            )}{" "}
                                                            {sale.unit ||
                                                                "unit"}{" "}
                                                            ·{" "}
                                                            {formatMoney(
                                                                sale.unitPrice,
                                                            )}
                                                            /
                                                            {sale.unit ||
                                                                "unit"}{" "}
                                                            ·{" "}
                                                            {channelLabel(
                                                                sale.salesChannel,
                                                            )}
                                                        </p>
                                                    </div>
                                                    <strong className="sales-history-total">
                                                        {formatMoney(
                                                            sale.totalAmount,
                                                        )}
                                                    </strong>
                                                </div>

                                                <dl className="sales-history-meta">
                                                    <div>
                                                        <dt>Received</dt>
                                                        <dd>
                                                            {formatMoney(
                                                                sale.amountReceived,
                                                            )}
                                                        </dd>
                                                    </div>
                                                    <div>
                                                        <dt>Balance</dt>
                                                        <dd>
                                                            {formatMoney(
                                                                saleBalance,
                                                            )}
                                                        </dd>
                                                    </div>
                                                    <div>
                                                        <dt>Payment</dt>
                                                        <dd>
                                                            {paymentStatusLabel(
                                                                sale.paymentStatus,
                                                            )}
                                                        </dd>
                                                    </div>
                                                    <div>
                                                        <dt>Fulfilment</dt>
                                                        <dd>
                                                            {fulfilmentStatusLabel(
                                                                sale.fulfilmentStatus,
                                                            )}
                                                        </dd>
                                                    </div>
                                                </dl>

                                                {(sale.buyerName || sale.buyerContact || sale.buyerArea || sale.buyerState || sale.buyerIdentityStatus) && (
                                                    <p className="sales-history-buyer">
                                                        Buyer: {sale.buyerName || (sale.buyerIdentityStatus === "anonymous" ? "Anonymous" : "Identity unknown")}
                                                        {sale.buyerContact ? ` · ${sale.buyerContact}` : ""}
                                                        {(sale.buyerArea || sale.buyerState)
                                                            ? ` · Location: ${[sale.buyerArea, sale.buyerState].filter(Boolean).join(", ")}`
                                                            : ""}
                                                        {sale.saleTime ? ` · ${sale.saleTime}` : ""}
                                                    </p>
                                                )}
                                            </article>
                                        );
                                    })}
                                </div>

                                {totalPages > 1 && (
                                    <nav
                                        className="sales-pagination"
                                        aria-label="Sales history pages"
                                    >
                                        <button
                                            type="button"
                                            className="sales-secondary"
                                            onClick={() =>
                                                setPage((value) =>
                                                    Math.max(
                                                        1,
                                                        value - 1,
                                                    ),
                                                )
                                            }
                                            disabled={
                                                !pagination?.hasPrevious ||
                                                salesLoading
                                            }
                                        >
                                            Previous
                                        </button>

                                        <span>
                                            Page {currentPage} of{" "}
                                            {totalPages} · {totalSales}{" "}
                                            {totalSales === 1
                                                ? "sale"
                                                : "sales"}
                                        </span>

                                        <button
                                            type="button"
                                            className="sales-secondary"
                                            onClick={() =>
                                                setPage(
                                                    (value) => value + 1,
                                                )
                                            }
                                            disabled={
                                                !pagination?.hasNext ||
                                                salesLoading
                                            }
                                        >
                                            Next
                                        </button>
                                    </nav>
                                )}
                            </>
                        )}
                </section>
            </div>
        </section>
    );
};

export default SalesLog;
