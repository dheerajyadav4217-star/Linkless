// Linkless server 2.1
// Basic Node.js server using built-in modules and the official MongoDB driver.
// Install the driver once with: npm install mongodb
// Start the server with: node server.js
//
// API routes:
// GET  /api/health
// POST /api/generate
// POST /api/upload?code=CODE&filename=file-name
// GET  /api/receive?code=CODE
//
// Files are stored in MongoDB GridFS. Sharing codes expire after 10 minutes.

const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { MongoClient, GridFSBucket, ObjectId } = require("mongodb");

function loadEnv() {
    const envPath = path.join(__dirname, ".env");
    if (!fs.existsSync(envPath)) return;

    const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);

    for (const line of lines) {
        const text = line.trim();
        if (!text || text.startsWith("#")) continue;

        const splitAt = text.indexOf("=");
        if (splitAt < 0) continue;

        const key = text.slice(0, splitAt).trim();
        const value = text.slice(splitAt + 1).trim().replace(/^["']|["']$/g, "");

        if (key && process.env[key] === undefined) {
            process.env[key] = value;
        }
    }
}

loadEnv();

const PORT = Number(process.env.PORT) || 3000;
const MONGO_URI = process.env.MONGO_URI;
const DB_NAME = process.env.DB_NAME || "linkless";

// Read the project settings from Frontend/data2.0.json.
const settingsPath = path.join(__dirname, "..", "Frontend", "data2.0.json");
let settings = {};

try {
    settings = JSON.parse(fs.readFileSync(settingsPath, "utf8"));
} catch (error) {
    console.error("Could not read Frontend/data2.0.json. Using basic default settings.");
}

const CODE_EXPIRY_MINUTES = Number(settings.codeExpiryMinutes) || 10;
const MAX_FILE_SIZE_MB = Number(settings.maxFileSizeMB) || 25;
const CODE_LIFETIME = CODE_EXPIRY_MINUTES * 60 * 1000;
const MAX_FILE_SIZE = MAX_FILE_SIZE_MB * 1024 * 1024;

if (!MONGO_URI || MONGO_URI.includes("your_mongodb_atlas_connection_string_here")) {
    console.error("Add your real MongoDB Atlas connection string to Backend/.env");
    process.exit(1);
}

const client = new MongoClient(MONGO_URI);
let database;
let bucket;
let shares;

function sendJson(res, status, value) {
    res.writeHead(status, {
        "Content-Type": "application/json; charset=utf-8",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
    });
    res.end(JSON.stringify(value));
}

function makeCode() {
    return crypto.randomBytes(4).toString("hex").toUpperCase();
}

function safeName(value) {
    return path.basename(value || "shared-file").replace(/["\r\n]/g, "_").slice(0, 180);
}

async function expireShare(share) {
    if (share.fileId) {
        try {
            await bucket.delete(new ObjectId(share.fileId));
        } catch (error) {
            // The file may already have been removed.
        }
    }
    await shares.deleteOne({ _id: share._id });
}

const server = http.createServer(async function (req, res) {
    if (req.method === "OPTIONS") {
        res.writeHead(204, {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type"
        });
        return res.end();
    }

    const url = new URL(req.url, "http://" + (req.headers.host || "localhost"));

    try {
        if (req.method === "GET" && url.pathname === "/api/health") {
            return sendJson(res, 200, { message: "Linkless server is running." });
        }

        if (req.method === "POST" && url.pathname === "/api/generate") {
            let code = makeCode();
            while (await shares.findOne({ code })) code = makeCode();

            await shares.insertOne({
                code,
                fileId: null,
                fileName: null,
                createdAt: new Date(),
                expiresAt: new Date(Date.now() + CODE_LIFETIME)
            });

            return sendJson(res, 201, {
                code,
                expiresInSeconds: CODE_LIFETIME / 1000
            });
        }

        if (req.method === "POST" && url.pathname === "/api/upload") {
            const code = (url.searchParams.get("code") || "").trim().toUpperCase();
            const fileName = safeName(url.searchParams.get("filename"));
            const share = await shares.findOne({ code });

            if (!share || share.expiresAt.getTime() <= Date.now()) {
                return sendJson(res, 404, { error: "Code not found or expired. Generate a new code." });
            }
            if (share.fileId) {
                return sendJson(res, 409, { error: "A file has already been uploaded for this code." });
            }

            const chunks = [];
            let size = 0;
            let tooLarge = false;

            req.on("data", function (chunk) {
                size += chunk.length;
                if (size > MAX_FILE_SIZE) tooLarge = true;
                else chunks.push(chunk);
            });

            req.on("error", function () {
                if (!res.headersSent) sendJson(res, 400, { error: "Upload failed." });
            });

            req.on("end", async function () {
                if (tooLarge) return sendJson(res, 413, { error: "Maximum file size is 25 MB." });
                if (size === 0) return sendJson(res, 400, { error: "No file data received." });

                try {
                    const upload = bucket.openUploadStream(fileName, {
                        metadata: { code, expiresAt: share.expiresAt }
                    });

                    upload.on("error", function () {
                        if (!res.headersSent) sendJson(res, 500, { error: "MongoDB file upload failed." });
                    });

                    upload.on("finish", async function () {
                        try {
                            const update = await shares.updateOne(
                                { _id: share._id, fileId: null },
                                { $set: { fileId: upload.id.toString(), fileName } }
                            );

                            if (update.modifiedCount !== 1) {
                                await bucket.delete(upload.id).catch(() => {});
                                return sendJson(res, 409, { error: "This code has already been used." });
                            }

                            return sendJson(res, 201, { message: "File uploaded.", code });
                        } catch (error) {
                            return sendJson(res, 500, { error: "Could not save file details." });
                        }
                    });

                    upload.end(Buffer.concat(chunks));
                } catch (error) {
                    return sendJson(res, 500, { error: "Could not upload the file." });
                }
            });

            return;
        }

        if (req.method === "GET" && url.pathname === "/api/receive") {
            const code = (url.searchParams.get("code") || "").trim().toUpperCase();
            const share = await shares.findOne({ code });

            if (!share) return sendJson(res, 404, { error: "Code not found or expired." });

            if (share.expiresAt.getTime() <= Date.now()) {
                await expireShare(share);
                return sendJson(res, 404, { error: "Code expired." });
            }

            if (!share.fileId) {
                return sendJson(res, 404, { error: "File has not been uploaded for this code yet." });
            }

            res.writeHead(200, {
                "Content-Type": "application/octet-stream",
                "Content-Disposition": 'attachment; filename="' + safeName(share.fileName) + '"',
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Expose-Headers": "Content-Disposition"
            });

            const download = bucket.openDownloadStream(new ObjectId(share.fileId));
            download.on("error", function () {
                if (!res.headersSent) sendJson(res, 404, { error: "File not found." });
                else res.destroy();
            });
            download.pipe(res);
            return;
        }

        return sendJson(res, 404, { error: "Route not found." });
    } catch (error) {
        console.error("Request error:", error.message);
        if (!res.headersSent) sendJson(res, 500, { error: "Server error. Check the terminal." });
    }
});

// Remove expired records and their stored files in the background.
async function cleanExpiredShares() {
    try {
        const expiredShares = await shares.find({
            expiresAt: { $lte: new Date() }
        }).toArray();

        for (const share of expiredShares) {
            await expireShare(share);
        }
    } catch (error) {
        console.error("Expiry cleanup error:", error.message);
    }
}

async function startServer() {
    await client.connect();
    database = client.db(DB_NAME);
    bucket = new GridFSBucket(database, { bucketName: "sharedFiles" });
    shares = database.collection("shares");

    // Index helps look up codes. Expiry is also checked in the route before download.
    await shares.createIndex({ code: 1 }, { unique: true });

    server.listen(PORT, "0.0.0.0", function () {
        console.log("Linkless server running on port " + PORT);
        console.log("Database: " + DB_NAME);
        console.log("Code expiry: " + CODE_EXPIRY_MINUTES + " minutes");
        console.log("Maximum file size: " + MAX_FILE_SIZE_MB + " MB");

        // Check for expired data once a minute.
        setInterval(cleanExpiredShares, 60 * 1000);
    });
}

startServer().catch(function (error) {
    console.error("Could not start Linkless:", error.message);
    process.exit(1);
});
