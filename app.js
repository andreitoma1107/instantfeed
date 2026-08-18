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

const feed = document.getElementById("feed");
const feedStatus = document.getElementById("feedStatus");
const refreshFeedButton = document.getElementById("refreshFeed");

let stream = null;
let capturedImage = null;

function setStatus(message, isError = false) {
  statusText.textContent = message;
  statusText.className = isError
    ? "status error"
    : "status";
}

function setFeedStatus(message, isError = false) {
  feedStatus.textContent = message;
  feedStatus.className = isError
    ? "feed-status error"
    : "feed-status";
}

async function startCamera() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    setStatus(
      "Camera nu este disponibilă. Deschide site-ul prin HTTPS.",
      true
    );
    return;
  }

  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: {
          ideal: "environment"
        }
      },
      audio: false
    });

    camera.srcObject = stream;

    camera.hidden = false;
    preview.hidden = true;

    startCameraButton.hidden = true;
    captureButton.hidden = false;
    captureButton.disabled = false;

    setStatus("Camera este pornită.");
  } catch (error) {
    console.error(error);

    setStatus(
      "Nu pot porni camera. Permite accesul la cameră și încearcă din nou.",
      true
    );
  }
}

function capturePhoto() {
  if (!stream || !camera.videoWidth || !camera.videoHeight) {
    setStatus("Camera nu este încă pregătită.", true);
    return;
  }

  canvas.width = camera.videoWidth;
  canvas.height = camera.videoHeight;

  const context = canvas.getContext("2d");

  context.drawImage(
    camera,
    0,
    0,
    canvas.width,
    canvas.height
  );

  capturedImage = canvas.toDataURL(
    "image/jpeg",
    0.85
  );

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

  preview.src = "";
  preview.hidden = true;
  camera.hidden = false;

  captureButton.hidden = false;
  captureButton.disabled = false;

  retakeButton.hidden = true;
  uploadButton.hidden = true;
  uploadButton.disabled = false;

  setStatus("Poți face o nouă fotografie.");
}

async function uploadPhoto() {
  if (!capturedImage) {
    setStatus("Mai întâi capturează o fotografie.", true);
    return;
  }

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

    if (!response.ok) {
      throw new Error("Serverul a returnat eroarea " + response.status);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(
        result.error || "Fotografia nu a putut fi salvată."
      );
    }

    setStatus("Fotografia a fost salvată în Google Drive.");

    uploadButton.hidden = true;

    await loadFeed();
  } catch (error) {
    console.error(error);

    setStatus(
      "Eroare la salvare: " + error.message,
      true
    );

    uploadButton.disabled = false;
  }
}

async function loadFeed() {
  setFeedStatus("Se încarcă fotografiile...");
  feed.innerHTML = "";

  try {
    const response = await fetch(
      BACKEND_URL + "?action=list"
    );

    if (!response.ok) {
      throw new Error("Feed-ul a returnat eroarea " + response.status);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(
        result.error || "Feed-ul nu a putut fi încărcat."
      );
    }

    if (!result.photos || result.photos.length === 0) {
      setFeedStatus("Nu există încă fotografii.");
      return;
    }

    setFeedStatus("");

    result.photos.forEach(function(photo) {
      const card = document.createElement("article");
      card.className = "photo-card";

      const image = document.createElement("img");
      image.src = photo.url;
      image.alt = photo.name;
      image.loading = "lazy";

      image.addEventListener("error", function() {
        image.alt = "Imagine indisponibilă";
        image.classList.add("image-error");
      });

      const details = document.createElement("div");
      details.className = "photo-details";

      const name = document.createElement("p");
      name.className = "photo-name";
      name.textContent = photo.name;

      const date = document.createElement("p");
      date.className = "photo-date";
      date.textContent = formatDate(photo.created);

      details.appendChild(name);
      details.appendChild(date);

      card.appendChild(image);
      card.appendChild(details);

      feed.appendChild(card);
    });
  } catch (error) {
    console.error(error);

    setFeedStatus(
      "Eroare la încărcarea fotografiilor.",
      true
    );
  }
}

function formatDate(dateValue) {
  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleString("ro-RO", {
    dateStyle: "medium",
    timeStyle: "short"
  });
}

function stopCamera() {
  if (!stream) {
    return;
  }

  stream.getTracks().forEach(function(track) {
    track.stop();
  });

  stream = null;
  camera.srcObject = null;
}

startCameraButton.addEventListener(
  "click",
  startCamera
);

captureButton.addEventListener(
  "click",
  capturePhoto
);

retakeButton.addEventListener(
  "click",
  retakePhoto
);

uploadButton.addEventListener(
  "click",
  uploadPhoto
);

refreshFeedButton.addEventListener(
  "click",
  loadFeed
);

window.addEventListener(
  "beforeunload",
  stopCamera
);

loadFeed();
