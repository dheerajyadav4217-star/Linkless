// Linkless - basic frontend logic
// The server creates codes and stores files in MongoDB.
// For local testing, the server runs at http://localhost:3000.
// When deployed, change API_BASE to the public address of your server.

const API_BASE = "http://localhost:3000";

const sendBtn = document.getElementById("sendBtn");
const receiveBtn = document.getElementById("receiveBtn");
const generateBtn = document.getElementById("generateBtn");

const sendPage = document.getElementById("sendPage");
const receivePage = document.getElementById("receivePage");
const shareCode = document.getElementById("shareCode");
const statusMessage = document.getElementById("statusMessage");

const fileInput = document.getElementById("fileInput");
const fileName = document.getElementById("fileName");
const uploadBtn = document.getElementById("uploadBtn");

const receiveCode = document.getElementById("receiveCode");
const receiveDataBtn = document.getElementById("receiveDataBtn");
const receiveMessage = document.getElementById("receiveMessage");

const backFromSend = document.getElementById("backFromSend");
const backFromReceive = document.getElementById("backFromReceive");

let currentCode = "";
let selectedFile = null;

function hidePages() {
    sendPage.hidden = true;
    receivePage.hidden = true;
}

sendBtn.addEventListener("click", function () {
    hidePages();
    sendPage.hidden = false;
    statusMessage.textContent = "";
});

receiveBtn.addEventListener("click", function () {
    hidePages();
    receivePage.hidden = false;
    receiveMessage.textContent = "";
    statusMessage.textContent = "";
});

backFromSend.addEventListener("click", hidePages);
backFromReceive.addEventListener("click", hidePages);

// Ask the backend to create a real sharing code.
generateBtn.addEventListener("click", async function () {
    shareCode.textContent = "";
    statusMessage.textContent = "Generating code...";

    try {
        const response = await fetch(API_BASE + "/api/generate", {
            method: "POST"
        });
        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || "Could not generate a code.");
        }

        currentCode = result.code;
        shareCode.textContent = "Your Code: " + currentCode;
        statusMessage.textContent = "Code created. Choose a file in Send Data, then send it.";
    } catch (error) {
        statusMessage.textContent =
            "Could not reach the server. Start server.js and try again.";
    }
});

// Remember which file the user picked.
fileInput.addEventListener("change", function () {
    selectedFile = fileInput.files.length ? fileInput.files[0] : null;
    fileName.textContent = selectedFile ? "Selected: " + selectedFile.name : "";
});

// Upload the selected file using the generated code.
uploadBtn.addEventListener("click", async function () {
    if (!selectedFile) {
        alert("Please choose a file first.");
        return;
    }

    if (!currentCode) {
        alert("Click Generate Code first.");
        return;
    }

    uploadBtn.disabled = true;
    uploadBtn.textContent = "Sending...";

    try {
        const url = API_BASE + "/api/upload?code=" +
            encodeURIComponent(currentCode) + "&filename=" +
            encodeURIComponent(selectedFile.name);

        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/octet-stream" },
            body: selectedFile
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || "Upload failed.");
        }

        statusMessage.textContent = "File sent. Share code: " + currentCode;
        alert("File uploaded. Share this code: " + currentCode);
    } catch (error) {
        alert(error.message || "Could not send the file. Check the server.");
    } finally {
        uploadBtn.disabled = false;
        uploadBtn.textContent = "Send File";
    }
});

// Ask the backend for the file that matches the entered code.
receiveDataBtn.addEventListener("click", async function () {
    const code = receiveCode.value.trim().toUpperCase();

    if (!code) {
        receiveMessage.textContent = "Please enter a sharing code.";
        return;
    }

    receiveDataBtn.disabled = true;
    receiveMessage.textContent = "Looking for the file...";

    try {
        const response = await fetch(
            API_BASE + "/api/receive?code=" + encodeURIComponent(code)
        );

        if (!response.ok) {
            let errorMessage = "Code not found, expired, or file not ready.";
            try {
                const result = await response.json();
                errorMessage = result.error || errorMessage;
            } catch (error) {
                // The server may return a non-JSON error.
            }
            throw new Error(errorMessage);
        }

        // The response is the file bytes. Create a temporary download link.
        const fileBlob = await response.blob();
        const downloadUrl = URL.createObjectURL(fileBlob);
        const downloadLink = document.createElement("a");

        // Read the original filename sent by the server.
        const disposition = response.headers.get("Content-Disposition") || "";
        const nameMatch = disposition.match(/filename="([^"]+)"/i);
        downloadLink.href = downloadUrl;
        downloadLink.download = nameMatch ? nameMatch[1] : "linkless-download";
        downloadLink.textContent = "Download file";
        downloadLink.style.display = "inline-block";

        receiveMessage.textContent = "";
        receiveMessage.appendChild(downloadLink);
        downloadLink.click();

        // Let the browser start the download before releasing the temporary URL.
        setTimeout(function () {
            URL.revokeObjectURL(downloadUrl);
        }, 60000);
    } catch (error) {
        receiveMessage.textContent = error.message || "Could not receive the file.";
    } finally {
        receiveDataBtn.disabled = false;
    }
});
