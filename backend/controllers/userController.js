import userModel from "../models/userModel.js";
import googleSignupContinuationModel from "../models/GoogleSignupContinuation.js";
import bcrypt from "bcrypt";
import { createHash, randomBytes } from "node:crypto";
import { verifyGoogleIdToken } from "../services/googleIdentityService.js";
import {
    AccountRegistrationError,
    escapeRegExp,
    normaliseEmail,
    registerCustomerAccount
} from "../services/accountRegistration.js";
import { createSessionToken, publicUser } from "../services/session.js";

const GOOGLE_SIGNUP_CONTINUATION_TTL_MS = 10 * 60 * 1000;

const createToken = (user) => createSessionToken(user);
const safeUser = (user) => publicUser(user);

const hashGoogleSignupContinuation = (reference) =>
    createHash("sha256").update(reference).digest("hex");

const createGoogleSignupContinuation = async(identity) => {
    const reference = randomBytes(32).toString("base64url");

    await googleSignupContinuationModel.create({
        referenceHash: hashGoogleSignupContinuation(reference),
        purpose: "google_signup_consent",
        googleId: identity.sub,
        email: identity.email,
        name: identity.name || identity.email.split("@")[0],
        expiresAt: new Date(Date.now() + GOOGLE_SIGNUP_CONTINUATION_TTL_MS)
    });

    return reference;
};

const findByVerifiedEmail = async(email) => {
    const escapedEmail = email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    const matches = await userModel
        .find({ email: new RegExp("^" + escapedEmail + "$", "i") })
        .limit(2);

    if (matches.length > 1) {
        const error = new Error(
            "Multiple Elevoni accounts match the verified Google email"
        );
        error.code = "GOOGLE_EMAIL_AMBIGUOUS";
        throw error;
    }

    return matches[0] || null;
};

const loginUser = async(req, res) => {
    const { email, password } = req.body;

    try {
        const normalisedEmail = normaliseEmail(email);

        const user = await userModel.findOne({
            email: {
                $regex: new RegExp(
                    "^" + escapeRegExp(normalisedEmail) + "$",
                    "i"
                )
            }
        });

        if (!user ||
            !user.password ||
            !(await bcrypt.compare(password, user.password))
        ) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        return res.json({
            success: true,
            token: createToken(user),
            user: safeUser(user)
        });
    } catch (error) {
        console.error("Login error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to log in"
        });
    }
};

const registerUser = async(req, res) => {
    const { name, password, email } = req.body;

    try {
        const user = await registerCustomerAccount({
            name,
            email,
            password
        });

        return res.status(201).json({
            success: true,
            token: createToken(user),
            user: safeUser(user)
        });
    } catch (error) {
        if (error instanceof AccountRegistrationError) {
            return res.status(error.status).json({
                success: false,
                message: error.message
            });
        }

        console.error("Registration error:", error);

        const duplicate = error && error.code === 11000;

        return res.status(duplicate ? 409 : 500).json({
            success: false,
            message: duplicate ? "User already exists" : "Unable to register"
        });
    }
};

const googleReturnOrigins = new Set([
    "https://elevonifarms.vercel.app",
    "https://elevonifarms-git-main-elevoni.vercel.app",
    "http://localhost:5173",
    "http://localhost:5174"
]);

const parseGoogleRedirectState = (state) => {
    const parts = typeof state === "string" ? state.split("|") : [];
    const flow = parts[0];
    const origin = parts[1];

    const validOrigin = googleReturnOrigins.has(origin) ? origin : null;

    if (flow === "sign_in") {
        return {
            intent: "sign_in",
            consentAccepted: false,
            origin: validOrigin
        };
    }

    if (flow === "sign_up_consented") {
        return {
            intent: "sign_up",
            consentAccepted: true,
            origin: validOrigin
        };
    }

    if (flow === "sign_up_unconsented") {
        return {
            intent: "sign_up",
            consentAccepted: false,
            origin: validOrigin
        };
    }

    return {
        intent: null,
        consentAccepted: false,
        origin: validOrigin
    };
};

const logGoogleCallbackEvent = (event, details) => {
    console.info(event, details);
};

const redactGoogleDiagnostic = (value, sensitiveValues) => {
    let safeValue = String(value == null ? "" : value);

    for (const sensitiveValue of sensitiveValues) {
        if (
            typeof sensitiveValue === "string" &&
            sensitiveValue.length > 0
        ) {
            safeValue = safeValue.split(sensitiveValue).join("[REDACTED]");
        }
    }

    return safeValue
        .replace(
            /\beyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g,
            "[REDACTED_TOKEN]"
        )
        .replace(/\bya29\.[A-Za-z0-9._-]+/g, "[REDACTED_TOKEN]")
        .replace(
            /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
            "[REDACTED_EMAIL]"
        )
        .replace(
            /mongodb(?:\+srv)?:\/\/[^\s"'`]+/gi,
            "[REDACTED_MONGODB_URI]"
        );
};

const logGoogleCallbackException = (error, sensitiveValues) => {
    logGoogleCallbackEvent("google_callback_exception", {
        message: redactGoogleDiagnostic(
            error && error.message ? error.message : error,
            sensitiveValues
        ),
        stack: redactGoogleDiagnostic(
            error && error.stack ? error.stack : "",
            sensitiveValues
        )
    });
};

const redirectGoogleOutcome = (
    res,
    origin, { token, code, intent, signupContinuation }
) => {
    const destination = new URL(origin);

    if (token) {
        destination.hash = new URLSearchParams({
            elevoni_google_token: token
        }).toString();
    } else if (signupContinuation) {
        destination.hash = new URLSearchParams({
            elevoni_google_signup: signupContinuation
        }).toString();
    } else {
        destination.searchParams.set(
            "google_auth_error",
            code || "GOOGLE_AUTH_FAILED"
        );
        destination.searchParams.set(
            "google_auth_intent",
            intent || "sign_in"
        );
    }

    const outcome = token ?
        "authenticated" :
        signupContinuation ?
        "continuation" :
        "error";

    logGoogleCallbackEvent("google_callback_redirect_generated", {
        status: 303,
        outcome,
        ...(outcome === "error" ?
            { errorCode: code || "GOOGLE_AUTH_FAILED" } :
            {})
    });

    return res.redirect(303, destination.toString());
};

const googleLogin = async(req, res) => {
    const { credential } = req.body || {};
    const isRedirectRequest = req.is("application/x-www-form-urlencoded");
    const sensitiveDiagnosticValues = [credential];

    logGoogleCallbackEvent("google_callback_received", {
        method: req.method,
        path: req.path,
        contentType:
            (req.get && req.get("content-type")) ||
            (req.headers && req.headers["content-type"]) ||
            null,
        origin:
            (req.get && req.get("origin")) ||
            (req.headers && req.headers.origin) ||
            null,
        credentialPresent: typeof credential === "string" && credential.length > 0
    });

    const redirectState = isRedirectRequest ?
        parseGoogleRedirectState(req.body && req.body.state) :
        null;

    const returnOrigin =
        (redirectState && redirectState.origin) ||
        "https://elevonifarms.vercel.app";

    let statusCode = 200;
    let intent;
    let consentAccepted;

    const response = isRedirectRequest ?
        {
            status(code) {
                statusCode = code;
                return this;
            },
            json(body) {
                if (body.success && body.token) {
                    return redirectGoogleOutcome(res, returnOrigin, {
                        token: body.token
                    });
                }

                if (
                    body.code === "CONSENT_REQUIRED" &&
                    body.signupContinuation
                ) {
                    return redirectGoogleOutcome(res, returnOrigin, {
                        signupContinuation: body.signupContinuation
                    });
                }

                const code = body.code || (
                    statusCode === 403 ?
                    "ACCOUNT_NOT_ALLOWED" :
                    statusCode === 409 ?
                    "ACCOUNT_CONFLICT" :
                    "GOOGLE_AUTH_FAILED"
                );

                return redirectGoogleOutcome(res, returnOrigin, {
                    code,
                    intent
                });
            }
        } :
        res;

    if (isRedirectRequest) {
        const cookieHeader = req.headers.cookie || "";
        const csrfCookie = cookieHeader
            .split(";")
            .map((part) => part.trim())
            .find((part) => part.startsWith("g_csrf_token="));

        const cookieToken = csrfCookie ?
            csrfCookie.slice("g_csrf_token=".length) :
            null;

        const bodyToken = req.body && req.body.g_csrf_token;

        const csrfMatches =
            typeof cookieToken === "string" &&
            typeof bodyToken === "string" &&
            cookieToken.length > 0 &&
            cookieToken === bodyToken;

        sensitiveDiagnosticValues.push(cookieToken, bodyToken);

        logGoogleCallbackEvent(
            csrfMatches ?
            "google_callback_csrf_passed" :
            "google_callback_csrf_failed", {
                cookiePresent: typeof cookieToken === "string" && cookieToken.length > 0,
                bodyValuePresent: typeof bodyToken === "string" && bodyToken.length > 0,
                comparisonPassed: csrfMatches
            }
        );

        intent = redirectState && redirectState.intent;
        consentAccepted = redirectState && redirectState.consentAccepted;

        if (!csrfMatches || !intent) {
            if (csrfMatches && !intent) {
                logGoogleCallbackEvent("google_callback_state_invalid");
            }

            return redirectGoogleOutcome(res, returnOrigin, {
                code: "GOOGLE_AUTH_FAILED",
                intent: intent || "sign_in"
            });
        }
    } else {
        intent = req.body && req.body.intent;
        consentAccepted = req.body && req.body.consentAccepted;
    }

    if (
        typeof credential !== "string" ||
        credential.length < 20 ||
        credential.length > 10000
    ) {
        logGoogleCallbackEvent(
            typeof credential === "string" ?
            "google_callback_credential_invalid" :
            "google_callback_credential_missing", {
                credentialPresent: typeof credential === "string" && credential.length > 0
            }
        );

        return response.status(400).json({
            success: false,
            message: "A valid Google credential is required"
        });
    }

    if (intent !== "sign_in" && intent !== "sign_up") {
        logGoogleCallbackEvent("google_callback_intent_invalid");

        return response.status(400).json({
            success: false,
            message: "Choose whether to sign in or create an account"
        });
    }

    if (!process.env.GOOGLE_CLIENT_ID) {
        logGoogleCallbackEvent("google_callback_client_id_missing");

        return response.status(503).json({
            success: false,
            message: "Google sign-in is not configured"
        });
    }

    let identity;
    let diagnosticContinuation = null;

    try {
        logGoogleCallbackEvent("google_callback_token_verification_started");

        identity = await verifyGoogleIdToken(
            credential,
            process.env.GOOGLE_CLIENT_ID
        );

        logGoogleCallbackEvent("google_callback_token_verified");

        let user = await userModel.findOne({ googleId: identity.sub });

        if (user) {
            logGoogleCallbackEvent("google_callback_existing_user", {
                lookup: "google_id"
            });

            if (user.role === "admin") {
                return response.status(403).json({
                    success: false,
                    message: "Google sign-in is unavailable for this account"
                });
            }

            return response.json({
                success: true,
                token: createToken(user),
                user: safeUser(user)
            });
        }

        user = await findByVerifiedEmail(identity.email);

        logGoogleCallbackEvent(
            "google_callback_account_lookup_completed", { found: Boolean(user) }
        );

        if (user) {
            logGoogleCallbackEvent("google_callback_existing_user", {
                lookup: "verified_email"
            });

            if (
                user.role === "admin" ||
                (user.googleId && user.googleId !== identity.sub)
            ) {
                return response.status(409).json({
                    success: false,
                    message: "This account cannot be linked to this Google account"
                });
            }

            user.googleId = identity.sub;
            await user.save();

            return response.json({
                success: true,
                token: createToken(user),
                user: safeUser(user)
            });
        }

        if (intent === "sign_in") {
            logGoogleCallbackEvent("google_callback_account_not_found");

            return response.status(404).json({
                success: false,
                code: "ACCOUNT_NOT_FOUND",
                message: "No Elevoni account was found for this Google account. Choose Sign Up to create one."
            });
        }

        if (consentAccepted !== true) {
            diagnosticContinuation = isRedirectRequest ?
                await createGoogleSignupContinuation(identity) :
                undefined;

            const signupContinuation = diagnosticContinuation;

            if (signupContinuation) {
                logGoogleCallbackEvent("google_callback_continuation_created");
            }

            return response.status(428).json({
                success: false,
                code: "CONSENT_REQUIRED",
                message: "Please accept the Terms of Use and Privacy Policy to create your Elevoni account.",
                ...(signupContinuation ? { signupContinuation } : {})
            });
        }

        const createdUser = await new userModel({
            name: identity.name || identity.email.split("@")[0],
            email: identity.email,
            googleId: identity.sub,
            role: "customer"
        }).save();

        logGoogleCallbackEvent("google_callback_new_user");

        return response.status(201).json({
            success: true,
            token: createToken(createdUser),
            user: safeUser(createdUser)
        });
    } catch (error) {
        logGoogleCallbackException(error, [
            ...sensitiveDiagnosticValues,
            diagnosticContinuation
        ]);

        if (error && error.code === "GOOGLE_EMAIL_AMBIGUOUS") {
            return response.status(409).json({
                success: false,
                message: "Multiple accounts match this verified Google email. Please contact support to link the correct account."
            });
        }

        if (error && error.code === "GOOGLE_TOKEN_INVALID") {
            return response.status(401).json({
                success: false,
                code: "GOOGLE_TOKEN_INVALID",
                message: "Google could not verify this sign-in. Please try again."
            });
        }

        if (error && error.code === 11000) {
            try {
                const concurrentUser = identity ?
                    await userModel.findOne({
                        $or: [
                            { googleId: identity.sub },
                            { email: identity.email }
                        ]
                    }) :
                    null;

                if (
                    concurrentUser &&
                    concurrentUser.role !== "admin" &&
                    concurrentUser.googleId === identity.sub
                ) {
                    return response.json({
                        success: true,
                        token: createToken(concurrentUser),
                        user: safeUser(concurrentUser)
                    });
                }
            } catch (lookupError) {
                logGoogleCallbackException(lookupError, [
                    ...sensitiveDiagnosticValues,
                    diagnosticContinuation
                ]);
            }

            return response.status(409).json({
                success: false,
                message: "This account could not be linked. Please sign in with your existing method."
            });
        }

        return response.status(500).json({
            success: false,
            message: "Unable to complete Google sign-in"
        });
    }
};

const completeGoogleSignup = async(req, res) => {
    const { continuation, consentAccepted } = req.body || {};

    if (
        typeof continuation !== "string" ||
        continuation.length !== 43
    ) {
        return res.status(400).json({
            success: false,
            message: "A valid Google signup continuation is required"
        });
    }

    try {
        const pending = await googleSignupContinuationModel.findOneAndDelete({
            referenceHash: hashGoogleSignupContinuation(continuation),
            purpose: "google_signup_consent"
        });

        if (!pending || pending.expiresAt <= new Date()) {
            return res.status(410).json({
                success: false,
                message: "This Google signup continuation has expired or was already used"
            });
        }

        if (consentAccepted !== true) {
            return res.status(428).json({
                success: false,
                code: "CONSENT_REQUIRED",
                message: "Please accept the Terms and Privacy Policy to continue"
            });
        }

        const identity = {
            sub: pending.googleId,
            email: pending.email,
            name: pending.name
        };

        let user = await userModel.findOne({ googleId: identity.sub });

        if (user && user.role === "admin") {
            return res.status(403).json({
                success: false,
                message: "Google sign-in is unavailable for this account"
            });
        }

        if (!user) {
            user = await findByVerifiedEmail(identity.email);

            if (user) {
                if (
                    user.role === "admin" ||
                    (user.googleId && user.googleId !== identity.sub)
                ) {
                    return res.status(409).json({
                        success: false,
                        message: "This account cannot be linked to this Google account"
                    });
                }

                user.googleId = identity.sub;
                await user.save();
            } else {
                user = await new userModel({
                    name: identity.name,
                    email: identity.email,
                    googleId: identity.sub,
                    role: "customer"
                }).save();
            }
        }

        return res.status(201).json({
            success: true,
            token: createToken(user),
            user: safeUser(user)
        });
    } catch (error) {
        if (
            error &&
            (
                error.code === "GOOGLE_EMAIL_AMBIGUOUS" ||
                error.code === 11000
            )
        ) {
            return res.status(409).json({
                success: false,
                message: "This account could not be linked. Please sign in with your existing method."
            });
        }

        console.error("Google signup continuation failed:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to complete Google sign-up"
        });
    }
};

const currentUser = async(req, res) => {
    try {
        const user = await userModel
            .findById(req.auth.userId)
            .select("name email role");

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Authentication required"
            });
        }

        return res.json({ success: true, user });
    } catch (error) {
        console.error("Current-user lookup failed:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to load account"
        });
    }
};

export {
    loginUser,
    registerUser,
    googleLogin,
    completeGoogleSignup,
    currentUser
};