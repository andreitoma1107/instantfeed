const BACKEND_URL =
  "https://script.google.com/macros/s/AKfycbx5zurFZoY_YSYAWzOFCrwcuncaGthboIN-1u5L-NmSZH12_dbp1HRcrMpkhCtSGMeR/exec";

const camera = document.getElementById("camera");
const canvas = document.getElementById("canvas");
const preview = document.getElementById("preview");

const startCameraButton = document.getElementById("startCamera");
const captureButton = document.getElementById("capture");
const retakeButton = document.getElementById("retake");
const uploadButton = document.getElementById("upload");
const statusText = document.getElementById("status");

let stream = null;
let capturedImage = null;

function setStatus(message, isError = false) {
  statusText.textContent = message;
  statusText.className = isError ? "error" : "";
}

async function startCamera() {
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: "environment" }
      },
      audio: false
    });

    camera.srcObject = stream;
    camera.hidden = false;
    captureButton.disabled = false;
    startCameraButton.hidden = true;

    setStatus("Camera este pornită.");
  } catch (error) {
    setStatus(
      "Nu pot porni camera. Verifică permisiunea și folosește HTTPS.",
      true
    );
    console.error(error);
  }
}

function capturePhoto() {
  if (!stream) return;

  canvas.width = camera.videoWidth;
  canvas.height = camera.videoHeight;

  const context = canvas.getContext("2d");
  context.drawImage(camera, 0, 0, canvas.width, canvas.height);

  capturedImage = canvas.toDataURL("image/jpeg", 0.85);
  preview.src = capturedImage;

  camera.hidden = true;
  preview.hidden = false;
  captureButton.hidden = true;
  retakeButton.hidden = false;
  uploadButton.hidden = false;

  setStatus("Fotografia este pregătită.");
}

function retakePhoto() {
  capturedImage = null;

  preview.hidden = true;
  camera.hidden = false;
  captureButton.hidden = false;
  retakeButton.hidden = true;
  uploadButton.hidden = true;

  setStatus("Poți face o nouă fotografie.");
}

async function uploadPhoto() {
  if (!capturedImage) return;

  uploadButton.disabled = true;
  setStatus("Se salvează fotografia...");

  try {
    const response = await fetch(BACKEND_URL, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8"
      },
      body: JSON.stringify({
        image: capturedImage
      })
    });

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || "Salvarea a eșuat.");
    }

    setStatus("Fotografia a fost salvată cu succes în Google Drive.");
    uploadButton.hidden = true;
  } catch (error) {
    setStatus("Eroare la salvare: " + error.message, true);
    uploadButton.disabled = false;
    console.error(error);
  }
}

startCameraButton.addEventListener("click", startCamera);
captureButton.addEventListener("click", capturePhoto);
retakeButton.addEventListener("click", retakePhoto);
uploadButton.addEventListener("click", uploadPhoto);

window.addEventListener("beforeunload", () => {
  if (stream) {
    stream.getTracks().forEach((track) => track.stop());
  }
});
