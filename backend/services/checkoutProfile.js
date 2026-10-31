const CHECKOUT_PROFILE_FIELDS = [
    "firstName",
    "lastName",
    "email",
    "phone",
    "street",
    "city",
    "state",
    "country"
];

const FIELD_LIMITS = {
    firstName: 100,
    lastName: 100,
    email: 254,
    phone: 40,
    street: 300,
    city: 120,
    state: 120,
    country: 120
};

export const buildCheckoutProfile = (input) => {
    if (!input || typeof input !== "object" || Array.isArray(input)) {
        return { error: "Checkout information must be an object" };
    }

    const checkoutProfile = {};
    for (const field of CHECKOUT_PROFILE_FIELDS) {
        const value = input[field];
        if (value === undefined || value === null) {
            checkoutProfile[field] = "";
            continue;
        }
        if (typeof value !== "string" || value.length > FIELD_LIMITS[field]) {
            return { error: `Invalid ${field} value` };
        }
        checkoutProfile[field] = value.trim();
    }

    if (!checkoutProfile.firstName || !checkoutProfile.phone || !checkoutProfile.street) {
        return { error: "First name, phone number and street address are required" };
    }

    if (
        checkoutProfile.email &&
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(checkoutProfile.email)
    ) {
        return { error: "Enter a valid email address" };
    }

    return { value: checkoutProfile };
};
