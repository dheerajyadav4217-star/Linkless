// ==========================================
// LINKLESS - SERVER
// ==========================================

// ==========================================
// IMPORTS
// ==========================================

const express = require("express");
const cors = require("cors");
const multer = require("multer");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const connectDatabase = require("./config/database");

// ==========================================
// APP
// ==========================================

const app = express();

connectDatabase();

// ==========================================
// SECURITY
// ==========================================

app.use(helmet());

app.use(cors());

app.use(
    express.json({
        limit: "100kb"
    })
);

// ==========================================
// GENERAL API RATE LIMIT
// ==========================================

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,

    message: {
        success: false,
        message: "Too many requests. Please try again later."
    }
});

app.use(
    "/api/share",
    apiLimiter
);

// ==========================================
// SHARE CODE RATE LIMIT
// ==========================================

const shareCodeLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,

    message: {
        success: false,
        message: "Too many attempts. Please try again later."
    }
});

// ==========================================
// UPLOAD RATE LIMIT
// ==========================================

const uploadLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,

    message: {
        success: false,
        message: "Too many uploads. Please try again later."
    }
});

// ==========================================
// UPLOAD DIRECTORY
// ==========================================

const uploadDirectory = path.join(
    __dirname,
    "uploads"
);

if (!fs.existsSync(uploadDirectory)) {
    fs.mkdirSync(
        uploadDirectory,
        {
            recursive: true
        }
    );
}

// ==========================================
// MULTER STORAGE
// ==========================================

const storage = multer.diskStorage({

    destination: function (
        req,
        file,
        cb
    ) {
        cb(
            null,
            uploadDirectory
        );
    },

    filename: function (
        req,
        file,
        cb
    ) {

        const randomName =
            crypto.randomUUID();

        const extension =
            path.extname(
                file.originalname
            );

        cb(
            null,
            randomName + extension
        );
    }
});

// ==========================================
// MULTER
// ==========================================

const upload = multer({

    storage: storage,

    limits: {

        fileSize:
            500 * 1024 * 1024,

        files: 20
    }
});

// ==========================================
// TEMPORARY SHARE STORAGE
// ==========================================

const shares = new Map();

// ==========================================
// GENERATE SECURE SHARE CODE
// ==========================================

function generateShareCode() {

    const characters =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

    let code = "";

    for (
        let i = 0;
        i < 6;
        i++
    ) {

        const index =
            crypto.randomInt(
                0,
                characters.length
            );

        code += characters[index];
    }

    return code;
}

// ==========================================
// CREATE UNIQUE CODE
// ==========================================

function createUniqueCode() {

    let code;

    do {

        code =
            generateShareCode();

    } while (
        shares.has(code)
    );

    return code;
}

// ==========================================
// DELETE SHARE
// ==========================================

function deleteShare(code) {

    const share =
        shares.get(code);

    if (!share) {
        return;
    }

    for (
        const file of share.files
    ) {

        try {

            if (
                fs.existsSync(
                    file.path
                )
            ) {

                fs.unlinkSync(
                    file.path
                );
            }

        } catch (error) {

            console.error(
                "File deletion failed:",
                error.message
            );
        }
    }

    shares.delete(code);

    console.log(
        `Share ${code} deleted.`
    );
}

// ==========================================
// CREATE SHARE
// ==========================================

app.post(
    "/api/share",

    uploadLimiter,

    upload.array(
        "files",
        20
    ),

    (req, res) => {

        try {

            if (
                !req.files ||
                req.files.length === 0
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Please upload at least one file."
                });
            }

            const code =
                createUniqueCode();

            const expiresAt =
                Date.now() +
                (
                    10 *
                    60 *
                    1000
                );

            const files =
                req.files.map(
                    (file, index) => ({

                        id: index,

                        name:
                            file.originalname,

                        storedName:
                            file.filename,

                        size:
                            file.size,

                        type:
                            file.mimetype,

                        path:
                            file.path
                    })
                );

            shares.set(
                code,
                {
                    code,
                    files,
                    createdAt:
                        Date.now(),
                    expiresAt
                }
            );

            console.log(
                `Share created: ${code}`
            );

            return res.status(201).json({

                success: true,

                message:
                    "Files uploaded successfully.",

                code,

                expiresAt,

                expiresIn:
                    600
            });

        } catch (error) {

            console.error(
                "Upload error:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    "Upload failed."
            });
        }
    }
);

// ==========================================
// GET SHARE INFORMATION
// ==========================================

app.get(
    "/api/share/:code",

    shareCodeLimiter,

    (req, res) => {

        const code =
            req.params.code
                .toUpperCase();

        if (
            !/^[A-Z0-9]{6}$/.test(
                code
            )
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Invalid share code."
            });
        }

        const share =
            shares.get(code);

        if (!share) {

            return res.status(404).json({

                success: false,

                message:
                    "Share code not found."
            });
        }

        if (
            Date.now() >
            share.expiresAt
        ) {

            deleteShare(code);

            return res.status(410).json({

                success: false,

                message:
                    "Share code has expired."
            });
        }

        const files =
            share.files.map(
                file => ({

                    id:
                        file.id,

                    name:
                        file.name,

                    size:
                        file.size,

                    type:
                        file.type
                })
            );

        return res.json({

            success: true,

            code,

            expiresAt:
                share.expiresAt,

            files
        });
    }
);

// ==========================================
// FLOAD FILE
// ==========================================

app.get(
    "/api/share/:code/file/:index",

    shareCodeLimiter,

    (req, res) => {

        const code =
            req.params.code
                .toUpperCase();

        const index =
            Number(
                req.params.index
            );

        if (
            !/^[A-Z0-9]{6}$/.test(
                code
            )
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Invalid share code."
            });
        }

        if (
            !Number.isInteger(index) ||
            index < 0
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Invalid file index."
            });
        }

        const share =
            shares.get(code);

        if (!share) {

            return res.status(404).json({

                success: false,

                message:
                    "Share code not found."
            });
        }

        if (
            Date.now() >
            share.expiresAt
        ) {

            deleteShare(code);

            return res.status(410).json({

                success: false,

                message:
                    "Share code has expired."
            });
        }

        const file =
            share.files[index];

        if (!file) {

            return res.status(404).json({

                success: false,

                message:
                    "File not found."
            });
        }

        if (
            !fs.existsSync(
                file.path
            )
        ) {

            return res.status(404).json({

                success: false,

                message:
                    "Physical file not found."
            });
        }

        return res.download(
            file.path,
            file.name
        );
    }
);

// ==========================================
// EXPIRY CLEANUP
// ==========================================

setInterval(
    () => {

        const now =
            Date.now();

        for (
            const [
                code,
                share
            ] of shares
        ) {

            if (
                now >
                share.expiresAt
            ) {

                deleteShare(code);
            }
        }

    },
    30 * 1000
);

// ==========================================
// FRONTEND
// ==========================================

const frontendDirectory =
    path.join(
        __dirname,
        "../frontend"
    );

app.use(
    express.static(
        frontendDirectory
    )
);

// ==========================================
// FRONTEND HOME
// ==========================================

app.get(
    "/",
    (req, res) => {

        res.sendFile(
            path.join(
                frontendDirectory,
                "index.html"
            )
        );
    }
);

// ==========================================
// MULTER ERROR HANDLER
// ==========================================

app.use(
    (
        error,
        req,
        res,
        next
    ) => {

        if (
            error instanceof
            multer.MulterError
        ) {

            if (
                error.code ===
                "LIMIT_FILE_SIZE"
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "File size cannot exceed 500 MB."
                });
            }

            if (
                error.code ===
                "LIMIT_FILE_COUNT"
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Maximum 20 files allowed."
                });
            }
        }

        console.error(
            "Server error:",
            error
        );

        return res.status(500).json({

            success: false,

            message:
                "Internal server error."
        });
    }
);

// ==========================================
// SERVER
// ==========================================

const PORT =
    process.env.PORT || 5000;

app.listen(
    PORT,
    () => {

        console.log(
            `Linkless server running on port ${PORT}`
        );
    }
);