// ==========================================
// LINKLESS - SCRIPT.JS
// ==========================================


// ==========================================
// API
// ==========================================

const API_BASE_URL = "";


// ==========================================
// DOM ELEMENTS
// ==========================================

const fileInput = document.getElementById("fileInput");
const selectedFiles = document.getElementById("selectedFiles");
const uploadBtn = document.getElementById("uploadBtn");
const copyCodeBtn =document.getElementById("copyCodeBtn");
const receiveBtn = document.getElementById("receiveBtn");


const shareCodeElement =
    document.getElementById("shareCode");

const expiryTimeElement =
    document.getElementById("expiryTime");

const receiveModal =
    document.getElementById("receiveModal");

const receiveForm =
    document.getElementById("receiveForm");

const receiveCodeInput =
    document.getElementById("receiveCode");

const receiveMessage =
    document.getElementById("receiveMessage");

const receivedFiles =
    document.getElementById("receivedFiles");


// ==========================================
// DOM READY
// ==========================================

document.addEventListener("DOMContentLoaded", () => {

    console.log(
        "Linkless JavaScript is connected!"
    );

});


// ==========================================
// GET STARTED
// ==========================================

function getStarted() {

    document
        .getElementById("home")
        .scrollIntoView({
            behavior: "smooth"
        });

}


// ==========================================
// OPEN FILE PICKER
// ==========================================

function openFilePicker() {

    fileInput.click();

}


// ==========================================
// FILE SELECTION
// ==========================================

fileInput.addEventListener("change", () => {

    selectedFiles.innerHTML = "";

    const files = fileInput.files;

    if (files.length === 0) {
        return;
    }


    for (const file of files) {

        const fileItem =
            document.createElement("div");

        fileItem.innerHTML = `
            <strong>${escapeHTML(file.name)}</strong>

            <p>
                Size:
                ${formatFileSize(file.size)}
            </p>

            <p>
                Type:
                ${file.type || "Unknown"}
            </p>
        `;

        selectedFiles.appendChild(fileItem);

    }

});


// ==========================================
// GENERATE SHARE CODE
// ==========================================

function generateShareCode() {

    const characters =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

    let code = "";

    for (let i = 0; i < 6; i++) {

        const randomIndex =
            Math.floor(
                Math.random() * characters.length
            );

        code += characters[randomIndex];

    }

    return code;
}


// ==========================================
// UPLOAD FILES TO BACKEND
// ==========================================

uploadBtn.addEventListener("click", async () => {

    const files = fileInput.files;


    if (files.length === 0) {

        alert(
            "Please select at least one file."
        );

        return;
    }


    uploadBtn.disabled = true;

    uploadBtn.textContent =
        "Uploading...";


    try {

        const formData =
            new FormData();


        for (const file of files) {

            formData.append(
                "files",
                file
            );

        }


        const response =
            await fetch(
                `${API_BASE_URL}/api/share`,
                {
                    method: "POST",
                    body: formData
                }
            );


        const result =
            await response.json();


        if (!response.ok || !result.success) {

            throw new Error(
                result.message ||
                "Upload failed."
            );

        }


        // Show REAL server-generated code

        shareCodeElement.textContent =
            result.code;


        // Start expiry countdown

        startCountdown(
            result.expiresAt
        );


        alert(
            `Files uploaded successfully!\n\nShare Code: ${result.code}`
        );


        console.log(
            "Upload result:",
            result
        );


    } catch (error) {

        console.error(
            "Upload failed:",
            error
        );


        alert(
            `Upload failed:\n${error.message}`
        );


    } finally {

        uploadBtn.disabled = false;

        uploadBtn.textContent =
            "Generate Share Code";

    }

});


// ==========================================
// COUNTDOWN
// ==========================================

function startCountdown(expiresAt) {

    const timer =
        setInterval(() => {

            const remaining =
                expiresAt - Date.now();


            if (remaining <= 0) {

                clearInterval(timer);

                expiryTimeElement.textContent =
                    "00:00";

                shareCodeElement.textContent =
                    "EXPIRED";

                return;

            }


            const totalSeconds =
                Math.floor(
                    remaining / 1000
                );


            const minutes =
                Math.floor(
                    totalSeconds / 60
                );


            const seconds =
                totalSeconds % 60;


            expiryTimeElement.textContent =
                `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

        }, 1000);

}


// ==========================================
// COPY SHARE CODE
// ==========================================

function copyCode(code) {

    if (!code || code === "EXPIRED") {

        return;

    }


    navigator.clipboard
        .writeText(code)

        .then(() => {

            alert(
                "Code copied successfully!"
            );

        })

        .catch(() => {

            alert(
                "Unable to copy code."
            );

        });

}
copyCodeBtn.addEventListener(
    "click",
    () => {
        copyCode(
            shareCodeElement.textContent
        );
    }
);


// ==========================================
// RECEIVE DATA MODAL
// ==========================================

function receiveData() {

    receiveModal.classList.add(
        "active"
    );

    receiveCodeInput.focus();

    receiveMessage.textContent = "";

    receivedFiles.innerHTML = "";

}
receiveBtn.addEventListener("click",receiveData);



// ==========================================
// CLOSE RECEIVE MODAL
// ==========================================

function closeReceiveModal() {

    receiveModal.classList.remove(
        "active"
    );

    receiveCodeInput.value = "";

    receiveMessage.textContent = "";

    receivedFiles.innerHTML = "";

}


// ==========================================
// RECEIVE CODE INPUT
// ==========================================

receiveCodeInput.addEventListener(
    "input",
    () => {

        receiveCodeInput.value =
            receiveCodeInput.value
                .toUpperCase()
                .replace(/[^A-Z0-9]/g, "")
                .slice(0, 6);

    }
);


// ==========================================
// RECEIVE DATA
// ==========================================

receiveForm.addEventListener(
    "submit",
    async (event) => {

        event.preventDefault();


        const code =
            receiveCodeInput.value.trim();


        if (!validateCode(code)) {

            receiveMessage.textContent =
                "Please enter a valid 6-character code.";

            return;
        }


        receiveMessage.textContent =
            "Checking share code...";


        receivedFiles.innerHTML = "";


        try {

            const response =
                await fetch(
                    `${API_BASE_URL}/api/share/${code}`
                );


            const result =
                await response.json();


            if (!response.ok || !result.success) {

                receiveMessage.textContent =
                    result.message ||
                    "Invalid or expired share code.";

                return;

            }


            receiveMessage.textContent =
                "Share found!";


            displayReceivedFiles(
                code,
                result.files
            );


        } catch (error) {

            console.error(
                "Receive request failed:",
                error
            );


            receiveMessage.textContent =
                "Unable to connect to Linkless server.";

        }

    }
);


// ==========================================
// DISPLAY RECEIVED FILES
// ==========================================

function displayReceivedFiles(
    code,
    files
) {

    receivedFiles.innerHTML = "";


    if (!files || files.length === 0) {

        receivedFiles.innerHTML =
            "<p>No files available.</p>";

        return;

    }


    files.forEach((file) => {

        const fileElement =
            document.createElement("div");


        fileElement.className =
            "received-file";


        fileElement.innerHTML = `
            <h4>
                ${escapeHTML(file.name)}
            </h4>

            <p>
                ${formatFileSize(file.size)}
                •
                ${file.type || "Unknown"}
            </p>

            <button
                type="button"
                class="btn btn-primary download-btn"
                data-code="$(code)"
                data-index="${file.id}"
            >
                Download
            </button>
        `;


        receivedFiles.appendChild(
            fileElement
        );
        const downloadButton =
        fileElement.querySelector(".download-btn")
        downloadButton.addEventListener(
            "click",
            () => {
                downloadFile(
                    code,
                    file.id
                );
            }
        );

    });

}


// ==========================================
// DOWNLOAD FILE
// ==========================================

function downloadFile(code, fileindex) {
    const downloadURL = 
        `${API_BASE_URL}/api/shere/${code}/file/${fileIndex}`;
        window.location.href = downloadURL
}


// ==========================================
// VALIDATE CODE
// ==========================================

function validateCode(code) {

    return /^[A-Z0-9]{6}$/.test(code);

}


// ==========================================
// FILE SIZE FORMAT
// ==========================================

function formatFileSize(bytes) {

    if (bytes < 1024) {

        return `${bytes} B`;

    }


    if (bytes < 1024 * 1024) {

        return `${(bytes / 1024).toFixed(2)} KB`;

    }


    if (bytes < 1024 * 1024 * 1024) {

        return `${(
            bytes /
            (1024 * 1024)
        ).toFixed(2)} MB`;

    }


    return `${(
        bytes /
        (1024 * 1024 * 1024)
    ).toFixed(2)} GB`;

}


// ==========================================
// CLEAR FILES
// ==========================================

function clearData() {

    fileInput.value = "";

    selectedFiles.innerHTML = "";

}


// ==========================================
// CLOSE MODAL ON OUTSIDE CLICK
// ==========================================

receiveModal.addEventListener(
    "click",
    (event) => {

        if (
            event.target ===
            receiveModal
        ) {

            closeReceiveModal();

        }

    }
);


// ==========================================
// ESCAPE HTML
// ==========================================

function escapeHTML(value) {

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}


// ==========================================
// TEST
// ==========================================

console.log(
    "Linkless JS loaded successfully!"
);