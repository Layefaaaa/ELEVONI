import bcrypt from "bcrypt";
import validator from "validator";
import userModel from "../models/userModel.js";

// New registrations store a normalised (trimmed, lower-cased) email and check
// for duplicates case-insensitively. Existing account documents are never
// rewritten: login looks accounts up case-insensitively.
const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const normaliseEmail = (email) => (typeof email === "string" ? email.trim().toLowerCase() : "");

const findAccountByEmail = async (email) => {
    const normalised = normaliseEmail(email);
    if (!normalised) return null;
    return userModel.findOne({ email: new RegExp(`^${escapeRegExp(normalised)}$`, "i") });
};

class AccountRegistrationError extends Error {
    constructor(message, status = 400) {
        super(message);
        this.name = "AccountRegistrationError";
        this.status = status;
    }
}

const validateAccountFields = ({ name, email, password }) => {
    if (!name || typeof name !== "string" || !name.trim() ||
        !password || typeof password !== "string" ||
        !email || typeof email !== "string") {
        return "Name, email, and password are required";
    }
    if (!validator.isEmail(normaliseEmail(email))) {
        return "Please enter a valid email";
    }
    if (password.length < 8) {
        return "Please enter a strong password";
    }
    return null;
};

// Creates a customer account. The role is always forced to "customer" so no
// public registration path can create an administrator.
const registerCustomerAccount = async ({ name, email, password } = {}) => {
    const validationError = validateAccountFields({ name, email, password });
    if (validationError) throw new AccountRegistrationError(validationError, 400);

    const normalisedEmail = normaliseEmail(email);
    if (await findAccountByEmail(normalisedEmail)) {
        throw new AccountRegistrationError("User already exists", 409);
    }

    const hashedPassword = await bcrypt.hash(password, await bcrypt.genSalt(10));
    try {
        return await new userModel({
            name: name.trim(),
            email: normalisedEmail,
            password: hashedPassword,
            role: "customer"
        }).save();
    } catch (error) {
        if (error?.code === 11000) {
            throw new AccountRegistrationError("User already exists", 409);
        }
        throw error;
    }
};

export {
    AccountRegistrationError,
    escapeRegExp,
    findAccountByEmail,
    normaliseEmail,
    registerCustomerAccount,
    validateAccountFields
};
