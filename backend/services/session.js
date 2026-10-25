import jwt from "jsonwebtoken";

// Session helpers shared by the customer and vendor registration flows. The
// token payload and lifetime are unchanged from the existing customer contract.
const createSessionToken = (user) => jwt.sign(
    { id: user._id.toString(), role: user.role || "customer" },
    process.env.JWT_SECRET,
    { algorithm: "HS256", expiresIn: "24h" }
);

const publicUser = (user) => ({
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role || "customer"
});

export { createSessionToken, publicUser };
