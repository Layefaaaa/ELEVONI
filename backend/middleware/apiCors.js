import cors from "cors";

const allowedOrigins = [
    "https://elevonifarms.vercel.app",
    "https://elevonifarms-git-main-elevoni.vercel.app",
    "https://elevoni-admin.vercel.app",
    "https://elevoni-vendors.vercel.app",
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5175",
    "http://localhost:5176",
    "http://localhost:5177",
    "http://localhost:5000",
    ...(process.env.FRONTEND_URL ?
        process.env.FRONTEND_URL.split(",").map((origin) => origin.trim()).filter(Boolean) :
        []),
    ...(process.env.ADMIN_URL ?
        process.env.ADMIN_URL.split(",").map((origin) => origin.trim()).filter(Boolean) :
        []),
    ...(process.env.VENDOR_PORTAL_URL ?
        process.env.VENDOR_PORTAL_URL.split(",").map((origin) => origin.trim()).filter(Boolean) :
        [])
];

const corsOptions = {
    origin: function(origin, callback) {
        if (!origin) {
            return callback(null, true);
        }

        if (allowedOrigins.indexOf(origin) !== -1) {
            return callback(null, true);
        }

        console.error("CORS blocked origin:", origin);
        return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "token"]
};

const apiCors = cors(corsOptions);

const apiCorsGate = (req, res, next) => {
    const isGoogleRedirectPost =
        req.method === "POST" &&
        req.path === "/api/user/google" &&
        req.is("application/x-www-form-urlencoded");

    if (isGoogleRedirectPost) {
        return next();
    }

    apiCors(req, res, (err) => {
        if (err) {
            return res.status(403).json({
                success: false,
                message: "Origin not allowed by CORS",
                origin: req.headers.origin || null
            });
        }

        // Explicitly finish successful browser preflight requests.
        if (req.method === "OPTIONS") {
            return res.status(204).end();
        }

        return next();
    });
};

export default apiCorsGate;