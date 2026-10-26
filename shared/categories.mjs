export const CATEGORY_TYPES = Object.freeze({
  GROUP: "group",
  LISTING: "listing",
});

export const CATEGORY_CHANNELS = Object.freeze({
  DIRECT: "direct",
  MARKETPLACE: "marketplace",
  NONE: "none",
});

export const CATEGORY_LAUNCH_STATUSES = Object.freeze({
  LIVE: "live",
  PLANNED: "planned",
  RESERVED: "reserved",
});

export const LEGACY_CATEGORY_NAMES_REQUIRING_REVIEW = Object.freeze([
  "Livestock & Meat",
]);

export const CATEGORIES = Object.freeze([
  Object.freeze({
    id: "aquaculture-fishery",
    name: "Aquaculture & Fishery",
    parentId: null,
    type: CATEGORY_TYPES.GROUP,
    channel: CATEGORY_CHANNELS.NONE,
    launchStatus: CATEGORY_LAUNCH_STATUSES.LIVE,
    vendorFocus: Object.freeze([]),
    legacyNames: Object.freeze(["Aquaculture & Fishery"]),
  }),
  Object.freeze({
    id: "smoked-catfish",
    name: "Smoked Catfish",
    parentId: "aquaculture-fishery",
    type: CATEGORY_TYPES.LISTING,
    channel: CATEGORY_CHANNELS.DIRECT,
    launchStatus: CATEGORY_LAUNCH_STATUSES.LIVE,
    vendorFocus: Object.freeze([]),
    legacyNames: Object.freeze([]),
  }),
  Object.freeze({
    id: "other-fish-aquaculture",
    name: "Other Fish & Aquaculture",
    parentId: "aquaculture-fishery",
    type: CATEGORY_TYPES.LISTING,
    channel: CATEGORY_CHANNELS.MARKETPLACE,
    launchStatus: CATEGORY_LAUNCH_STATUSES.PLANNED,
    vendorFocus: Object.freeze([]),
    legacyNames: Object.freeze(["Catfish & Aquaculture"]),
  }),
  Object.freeze({
    id: "livestock",
    name: "Livestock",
    parentId: null,
    type: CATEGORY_TYPES.GROUP,
    channel: CATEGORY_CHANNELS.NONE,
    launchStatus: CATEGORY_LAUNCH_STATUSES.PLANNED,
    vendorFocus: Object.freeze([]),
    legacyNames: Object.freeze(["Livestock"]),
  }),
  Object.freeze({
    id: "poultry-eggs",
    name: "Poultry & Eggs",
    parentId: "livestock",
    type: CATEGORY_TYPES.LISTING,
    channel: CATEGORY_CHANNELS.MARKETPLACE,
    launchStatus: CATEGORY_LAUNCH_STATUSES.PLANNED,
    vendorFocus: Object.freeze(["poultry"]),
    legacyNames: Object.freeze(["Poultry & Eggs"]),
  }),
  Object.freeze({
    id: "cattle",
    name: "Cattle",
    parentId: "livestock",
    type: CATEGORY_TYPES.LISTING,
    channel: CATEGORY_CHANNELS.MARKETPLACE,
    launchStatus: CATEGORY_LAUNCH_STATUSES.PLANNED,
    vendorFocus: Object.freeze(["cattle"]),
    legacyNames: Object.freeze([]),
  }),
  Object.freeze({
    id: "sheep",
    name: "Sheep",
    parentId: "livestock",
    type: CATEGORY_TYPES.LISTING,
    channel: CATEGORY_CHANNELS.MARKETPLACE,
    launchStatus: CATEGORY_LAUNCH_STATUSES.PLANNED,
    vendorFocus: Object.freeze(["sheep"]),
    legacyNames: Object.freeze([]),
  }),
  Object.freeze({
    id: "goats",
    name: "Goats",
    parentId: "livestock",
    type: CATEGORY_TYPES.LISTING,
    channel: CATEGORY_CHANNELS.MARKETPLACE,
    launchStatus: CATEGORY_LAUNCH_STATUSES.PLANNED,
    vendorFocus: Object.freeze(["goats"]),
    legacyNames: Object.freeze([]),
  }),
  Object.freeze({
    id: "crops-produce",
    name: "Crops & Produce",
    parentId: null,
    type: CATEGORY_TYPES.GROUP,
    channel: CATEGORY_CHANNELS.NONE,
    launchStatus: CATEGORY_LAUNCH_STATUSES.PLANNED,
    vendorFocus: Object.freeze([]),
    legacyNames: Object.freeze([]),
  }),
  Object.freeze({
    id: "grains-cereals",
    name: "Grains & Cereals",
    parentId: "crops-produce",
    type: CATEGORY_TYPES.LISTING,
    channel: CATEGORY_CHANNELS.MARKETPLACE,
    launchStatus: CATEGORY_LAUNCH_STATUSES.PLANNED,
    vendorFocus: Object.freeze([]),
    legacyNames: Object.freeze(["Grains & Cereals"]),
  }),
  Object.freeze({
    id: "vegetables-fruits",
    name: "Vegetables & Fruits",
    parentId: "crops-produce",
    type: CATEGORY_TYPES.LISTING,
    channel: CATEGORY_CHANNELS.MARKETPLACE,
    launchStatus: CATEGORY_LAUNCH_STATUSES.PLANNED,
    vendorFocus: Object.freeze([]),
    legacyNames: Object.freeze(["Vegetables & Fruits"]),
  }),
  Object.freeze({
    id: "tubers-starch",
    name: "Tubers & Starch",
    parentId: "crops-produce",
    type: CATEGORY_TYPES.LISTING,
    channel: CATEGORY_CHANNELS.MARKETPLACE,
    launchStatus: CATEGORY_LAUNCH_STATUSES.PLANNED,
    vendorFocus: Object.freeze([]),
    legacyNames: Object.freeze(["Tubers & Starch"]),
  }),
  Object.freeze({
    id: "processed-other-farm-products",
    name: "Processed & Other Farm Products",
    parentId: null,
    type: CATEGORY_TYPES.GROUP,
    channel: CATEGORY_CHANNELS.NONE,
    launchStatus: CATEGORY_LAUNCH_STATUSES.PLANNED,
    vendorFocus: Object.freeze([]),
    legacyNames: Object.freeze([]),
  }),
  Object.freeze({
    id: "processed-agro-goods",
    name: "Processed Agro-Goods",
    parentId: "processed-other-farm-products",
    type: CATEGORY_TYPES.LISTING,
    channel: CATEGORY_CHANNELS.MARKETPLACE,
    launchStatus: CATEGORY_LAUNCH_STATUSES.PLANNED,
    vendorFocus: Object.freeze([]),
    legacyNames: Object.freeze(["Processed Agro-Goods"]),
  }),
  Object.freeze({
    id: "other-farm-products",
    name: "Other Farm Products",
    parentId: "processed-other-farm-products",
    type: CATEGORY_TYPES.LISTING,
    channel: CATEGORY_CHANNELS.NONE,
    launchStatus: CATEGORY_LAUNCH_STATUSES.RESERVED,
    vendorFocus: Object.freeze([]),
    legacyNames: Object.freeze(["Other Farm Products"]),
  }),
]);

const CATEGORY_BY_ID = new Map(CATEGORIES.map((category) => [category.id, category]));

export const getCategoryById = (id) => CATEGORY_BY_ID.get(id) || null;

export const listTopLevelCategories = () =>
  CATEGORIES.filter((category) => category.parentId === null);

export const listChildCategories = (parentId) =>
  CATEGORIES.filter((category) => category.parentId === parentId);

export const listListingCategories = () =>
  CATEGORIES.filter((category) => category.type === CATEGORY_TYPES.LISTING);

export const isListingCategory = (category) =>
  category?.type === CATEGORY_TYPES.LISTING;
