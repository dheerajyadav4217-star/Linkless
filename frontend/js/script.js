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

const fileInput =
    document.getElementById("fileInput");

const selectedFiles =
    document.getElementById("selectedFiles");

const uploadBtn =
    document.getElementById("uploadBtn");

const copyCodeBtn =
    document.getElementById("copyCodeBtn");

const receiveBtn =
    document.getElementById("receiveBtn");

const closeReceiveBtn =
    document.getElementById("closeReceiveBtn");

const sendDataBtn =
    document.getElementById("sendDataBtn");

const closeSendDataBtn =
    document.getElementById("closeSendDataBtn");

const doneSendDataBtn =
    document.getElementById("doneSendDataBtn");

const sendDataPage =
    document.getElementById("sendDataPage");

const textMassage =
    document.getElementById("textmassage");

const getStartedBtn =
    document.getElementById("getStartedBtn");

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

document.addEventListener(
    "DOMContentLoaded",
    () => {

        console.log(
            "Linkless JavaScript is connected!"
        );

    }
);


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

getStartedBtn.addEventListener(
    "click",
    getStarted
);


// ==========================================
// SEND DATA PAGE
// ==========================================

function openSendDataPage() {

    document
        .getElementById("home")
        .style.display = "none";

    sendDataPage.classList.add("active");

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });

    textMassage.focus();

}


sendDataBtn.addEventListener(
    "click",
    openSendDataPage
);


// ==========================================
// CLOSE SEND DATA PAGE
// ==========================================

function closeSendDataPage() {

    sendDataPage.classList.remove(
        "active"
    );

    document
        .getElementById("home")
        .style.display = "";

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });

}


closeSendDataBtn.addEventListener(
    "click",
    closeSendDataPage
);


// ==========================================
// DONE BUTTON
// ==========================================

function doneSendData() {

    closeSendDataPage();

}


doneSendDataBtn.addEventListener(
    "click",
    doneSendData
);


// ==========================================
// OPEN FILE PICKER
// ==========================================

function openFilePicker() {

    fileInput.click();

}


// ==========================================
// FILE SELECTION
// ==========================================

fileInput.addEventListener(
    "change",
    () => {

        renderSelectedFiles();

    }
);


// ==========================================
// DISPLAY SELECTED FILES
// ==========================================

function renderSelectedFiles() {

    selectedFiles.innerHTML = "";

    const files =
        Array.from(
            fileInput.files
        );


    if (files.length === 0) {

        return;

    }


    files.forEach(
        (file, index) => {

            const fileItem =
                document.createElement("div");

            fileItem.className =
                "selected-file";


            fileItem.innerHTML = `

                <div class="selected-file-info">

                    <span class="selected-file-name">
                        ${escapeHTML(file.name)}
                    </span>

                    <span class="selected-file-size">
                        ${formatFileSize(file.size)}
                    </span>

                </div>

                <button
                    type="button"
                    class="remove-file-btn"
                    data-index="${index}"
                    aria-label="Remove file"
                >
                    ×
                </button>

            `;


            selectedFiles.appendChild(
                fileItem
            );

        }
    );


    const removeButtons =
        selectedFiles.querySelectorAll(
            ".remove-file-btn"
        );


    removeButtons.forEach(
        (button) => {

            button.addEventListener(
                "click",
                () => {

                    removeSelectedFile(
                        Number(
                            button.dataset.index
                        )
                    );

                }
            );

        }
    );

}


// ==========================================
// REMOVE SELECTED FILE
// ==========================================

function removeSelectedFile(index) {

    const files =
        Array.from(
            fileInput.files
        );


    files.splice(
        index,
        1
    );


    const dataTransfer =
        new DataTransfer();


    files.forEach(
        (file) => {

            dataTransfer.items.add(
                file
            );

        }
    );


    fileInput.files =
        dataTransfer.files;


    renderSelectedFiles();

}


// ==========================================
// GENERATE SHARE CODE
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

        const randomIndex =
            Math.floor(
                Math.random() *
                characters.length
            );

        code +=
            characters[randomIndex];

    }


    return code;

}


// ==========================================
// UPLOAD DATA + GENERATE CODE
// ==========================================

uploadBtn.addEventListener(
    "click",
    async () => {

        const files =
            Array.from(
                fileInput.files
            );

        const message =
            textMassage.value.trim();


        // ==========================================
        // VALIDATION
        // ==========================================

        if (
            files.length === 0 &&
            message.length === 0
        ) {

            alert(
                "Please write a message or attach at least one file."
            );

            return;

        }


        uploadBtn.disabled = true;

        uploadBtn.textContent =
            "Generating...";


        try {

            const formData =
                new FormData();


            // ==========================================
            // ADD MESSAGE
            // ==========================================

            if (message.length > 0) {

                formData.append(
                    "message",
                    message
                );

            }


            // ==========================================
            // ADD FILES
            // ==========================================

            for (
                const file of files
            ) {

                formData.append(
                    "files",
                    file
                );

            }


            // ==========================================
            // SEND TO SERVER
            // ==========================================

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


            if (
                !response.ok ||
                !result.success
            ) {

                throw new Error(
                    result.message ||
                    "Unable to generate share code."
                );

            }


            // ==========================================
            // SHOW REAL SERVER CODE
            // ==========================================

            shareCodeElement.textContent =
                result.code;


            // ==========================================
            // START COUNTDOWN
            // ==========================================

            startCountdown(
                result.expiresAt
            );


            // ==========================================
            // RETURN TO HOME
            // ==========================================

            closeSendDataPage();


            // ==========================================
            // SUCCESS MESSAGE
            // ==========================================

            alert(
                `Share code generated successfully!\n\nCode: ${result.code}`
            );


            console.log(
                "Share result:",
                result
            );


        } catch (error) {

            console.error(
                "Share creation failed:",
                error
            );


            alert(
                `Unable to generate share code:\n${error.message}`
            );


        } finally {

            uploadBtn.disabled =
                false;

            uploadBtn.textContent =
                "Generate Code";

        }

    }
);


// ==========================================
// COUNTDOWN
// ==========================================

let countdownTimer = null;


function startCountdown(expiresAt) {

    if (countdownTimer) {

        clearInterval(
            countdownTimer
        );

    }


    function updateCountdown() {

        const remaining =
            expiresAt -
            Date.now();


        if (
            remaining <= 0
        ) {

            clearInterval(
                countdownTimer
            );

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

    }


    updateCountdown();


    countdownTimer =
        setInterval(
            updateCountdown,
            1000
        );

}


// ==========================================
// COPY SHARE CODE
// ==========================================

function copyCode(code) {

    if (
        !code ||
        code === "------" ||
        code === "EXPIRED"
    ) {

        alert(
            "There is no active share code."
        );

        return;

    }


    navigator.clipboard
        .writeText(code)

        .then(
            () => {

                alert(
                    "Code copied successfully!"
                );

            }
        )

        .catch(
            () => {

                alert(
                    "Unable to copy code."
                );

            }
        );

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

    receiveMessage.textContent =
        "";

    receivedFiles.innerHTML =
        "";

}


receiveBtn.addEventListener(
    "click",
    receiveData
);


// ==========================================
// CLOSE RECEIVE MODAL
// ==========================================

function closeReceiveModal() {

    receiveModal.classList.remove(
        "active"
    );

    receiveCodeInput.value =
        "";

    receiveMessage.textContent =
        "";

    receivedFiles.innerHTML =
        "";

}


closeReceiveBtn.addEventListener(
    "click",
    closeReceiveModal
);


// ==========================================
// RECEIVE CODE INPUT
// ==========================================

receiveCodeInput.addEventListener(
    "input",
    () => {

        receiveCodeInput.value =
            receiveCodeInput.value
                .toUpperCase()
                .replace(
                    /[^A-Z0-9]/g,
                    ""
                )
                .slice(
                    0,
                    6
                );

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


        if (
            !validateCode(code)
        ) {

            receiveMessage.textContent =
                "Please enter a valid 6-character code.";

            return;

        }


        receiveMessage.textContent =
            "Checking share code...";


        receivedFiles.innerHTML =
            "";


        try {

            const response =
                await fetch(
                    `${API_BASE_URL}/api/share/${code}`
                );


            const result =
                await response.json();


            if (
                !response.ok ||
                !result.success
            ) {

                receiveMessage.textContent =
                    result.message ||
                    "Invalid or expired share code.";

                return;

            }


            receiveMessage.textContent =
                result.message
                    ? `Message: ${result.message}`
                    : "Share found!";


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

    receivedFiles.innerHTML =
        "";


    if (
        !files ||
        files.length === 0
    ) {

        if (
            !receivedFiles.innerHTML
        ) {

            const message =
                document.createElement("p");

            message.textContent =
                "No files available.";

            receivedFiles.appendChild(
                message
            );

        }

        return;

    }


    files.forEach(
        (file) => {

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
                    ${escapeHTML(file.type || "Unknown")}
                </p>

                <button
                    type="button"
                    class="btn btn-primary download-btn"
                >
                    Download
                </button>

            `;


            receivedFiles.appendChild(
                fileElement
            );


            const downloadButton =
                fileElement.querySelector(
                    ".download-btn"
                );


            downloadButton.addEventListener(
                "click",
                () => {

                    downloadFile(
                        code,
                        file.id
                    );

                }
            );

        }
    );

}


// ==========================================
// DOWNLOAD FILE
// ==========================================

function downloadFile(
    code,
    fileIndex
) {

    const downloadURL =
        `${API_BASE_URL}/api/share/${code}/file/${fileIndex}`;


    window.location.href =
        downloadURL;

}


// ==========================================
// VALIDATE CODE
// ==========================================

function validateCode(code) {

    return /^[A-Z0-9]{6}$/.test(
        code
    );

}


// ==========================================
// FILE SIZE FORMAT
// ==========================================

function formatFileSize(bytes) {

    if (
        bytes < 1024
    ) {

        return `${bytes} B`;

    }


    if (
        bytes <
        1024 * 1024
    ) {

        return `${(
            bytes / 1024
        ).toFixed(2)} KB`;

    }


    if (
        bytes <
        1024 *
        1024 *
        1024
    ) {

        return `${(
            bytes /
            (1024 * 1024)
        ).toFixed(2)} MB`;

    }


    return `${(
        bytes /
        (1024 *
        1024 *
        1024)
    ).toFixed(2)} GB`;

}


// ==========================================
// CLEAR DATA
// ==========================================

function clearData() {

    fileInput.value =
        "";

    selectedFiles.innerHTML =
        "";

    textMassage.value =
        "";

}


// ==========================================
// CLOSE RECEIVE MODAL
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
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );

}


// ==========================================
// TEST
// ==========================================

console.log(
    "Linkless JS loaded successfully!"
);