const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 200;

// A limit of 0 means "no limit": the caller returns every matching document.
const parsePagination = (query = {}, { defaultLimit = DEFAULT_PAGE_SIZE, maxLimit = MAX_PAGE_SIZE } = {}) => {
    const rawLimit = Number.parseInt(query?.limit, 10);
    const rawPage = Number.parseInt(query?.page, 10);
    const requested = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, maxLimit) : defaultLimit;
    const limit = requested > 0 ? requested : 0;
    const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
    return { page, limit, skip: limit > 0 ? (page - 1) * limit : 0 };
};

const buildPaginationMeta = ({ page = 1, limit = 0, total = 0 } = {}) => ({
    page,
    limit,
    total,
    totalPages: limit > 0 ? Math.ceil(total / limit) : 0,
    hasPrevious: page > 1,
    hasNext: limit > 0 ? page * limit < total : false
});

// Injected models in tests do not always expose countDocuments.
const countMatching = async (Model, query) => {
    if (typeof Model?.countDocuments !== "function") return null;
    return Model.countDocuments(query);
};

export { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, parsePagination, buildPaginationMeta, countMatching };
