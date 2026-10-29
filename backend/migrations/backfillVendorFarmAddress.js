import "dotenv/config";
import mongoose from "mongoose";
import { pathToFileURL } from "node:url";
import vendorProfileModel from "../models/vendorProfileModel.js";

const migrationFilter = () => ({ $or: [
    { farmAddress: { $exists: false } },
    { "farmAddress.state": { $exists: false } },
    { "farmAddress.lga": { $exists: false } }
] });

const buildUpdate = (profile) => ({ $set: { farmAddress: {
    street: profile.farmAddress?.street || "",
    area: profile.farmAddress?.area || profile.location || "",
    state: profile.state || profile.farmAddress?.state || "",
    lga: profile.lga || profile.farmAddress?.lga || "",
    country: profile.farmAddress?.country || "Nigeria"
} } });

const runMigration = async ({ dryRun = true, Model = vendorProfileModel, log = console.log } = {}) => {
    const profiles = await Model.find(migrationFilter(), "businessName location state lga farmAddress");
    if (dryRun) {
        log(`[migration] DRY RUN — ${profiles.length} vendor profile(s) need farmAddress backfill`);
        for (const profile of profiles) log(`  ${profile.businessName}: ${profile.farmAddress?.state || profile.state || "state unknown"} / ${profile.farmAddress?.lga || profile.lga || "LGA unknown"}`);
        log("[migration] no writes performed; rerun with --apply to write changes");
        return { matched: profiles.length, modified: 0, dryRun: true };
    }
    let modified = 0;
    for (const profile of profiles) {
        const result = await Model.updateOne({ _id: profile._id }, buildUpdate(profile));
        modified += result.modifiedCount || 0;
    }
    log(`[migration] farmAddress backfill complete: ${modified} profile(s) modified`);
    return { matched: profiles.length, modified, dryRun: false };
};

const main = async () => {
    if (!process.env.MONGO_URI) throw new Error("MONGO_URI is required");
    const apply = process.argv.includes("--apply");
    try { await mongoose.connect(process.env.MONGO_URI); await runMigration({ dryRun: !apply }); }
    finally { await mongoose.disconnect(); }
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch((error) => { console.error("[migration] failed:", error.message); process.exitCode = 1; });

export { migrationFilter, buildUpdate, runMigration };
