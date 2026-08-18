const BACKEND_URL =
  "https://script.google.com/macros/s/AKfycbx5zurFZoY_YSYAWzOFCrwcuncaGthboIN-1u5L-NmSZH12_dbp1HRcrMpkhCtSGMeR/exec";

const camera = document.getElementById("camera");
const canvas = document.getElementById("canvas");
const preview = document.getElementById("preview");

const startCameraButton =
  document.getElementById("startCamera");

const captureButton =
  document.getElementById("capture");

const retakeButton =
  document.getElementById("retake");

const uploadButton =
  document.getElementById("upload");

const statusText =
  document.getElementById("status");

const feed =
  document.getElementById("feed");

const feedStatus =
  document.getElementById("feedStatus");

const refreshFeedButton =
  document.getElementById("refreshFeed");

let stream = null;
let capturedImage = null;

function setStatus(message, isError) {
  statusText.textContent = message;
  statusText.className = isError
    ? "status error"
    : "status";
}

function setFeedStatus(message, isError) {
  feedStatus.textContent = message;
  feedStatus.className = isError
    ? "feed-status error"
    : "feed-status";
}

async function startCamera() {
  if (
    !navigator.mediaDevices ||
    !navigator.mediaDevices.getUserMedia
  ) {
    setStatus(
      "Camera necesită o pagină HTTPS.",
      true
    );

    return;
  }

  try {
    stream =
      await navigator.mediaDevices.getUserMedia({
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

    setStatus(
      "Camera este pornită.",
      false
    );
  } catch (error) {
    console.error(error);

    setStatus(
      "Nu pot porni camera.",
      true
    );
  }
}

function capturePhoto() {
  if (
    !stream ||
    !camera.videoWidth ||
    !camera.videoHeight
  ) {
    setStatus(
      "Camera nu este pregătită.",
      true
    );

    return;
  }

  canvas.width = camera.videoWidth;
  canvas.height = camera.videoHeight;

  var context = canvas.getContext("2d");

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

  setStatus(
    "Fotografia este pregătită.",
    false
  );
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

  setStatus(
    "Poți face o nouă fotografie.",
    false
  );
}

async function uploadPhoto() {
  if (!capturedImage) {
    setStatus(
      "Capturează mai întâi o fotografie.",
      true
    );

    return;
  }

  uploadButton.disabled = true;

  setStatus(
    "Se salvează fotografia...",
    false
  );

  try {
    var response = await fetch(
      BACKEND_URL,
      {
        method: "POST",
        headers: {
          "Content-Type":
            "text/plain;charset=utf-8"
        },
        body: JSON.stringify({
          image: capturedImage
        })
      }
    );

    var result = await response.json();

    if (!result.success) {
      throw new Error(
        result.error ||
        "Salvarea a eșuat."
      );
    }

    setStatus(
      "Fotografia a fost salvată.",
      false
    );

    uploadButton.hidden = true;

    await loadFeed();
  } catch (error) {
    console.error(error);

    setStatus(
      "Eroare la salvare: " +
      error.message,
      true
    );

    uploadButton.disabled = false;
  }
}

async function loadFeed() {
  setFeedStatus(
    "Se încarcă fotografiile...",
    false
  );

  feed.innerHTML = "";

  try {
    var response = await fetch(
      BACKEND_URL +
      "?action=list&t=" +
      Date.now()
    );

    var result = await response.json();

    if (!result.success) {
      throw new Error(
        result.error ||
        "Feed-ul nu a putut fi încărcat."
      );
    }

    if (
      !result.photos ||
      result.photos.length === 0
    ) {
      setFeedStatus(
        "Nu există încă fotografii.",
        false
      );

      return;
    }

    setFeedStatus("", false);

    for (var i = 0; i < result.photos.length; i++) {
      await addPhotoToFeed(result.photos[i]);
    }
  } catch (error) {
    console.error(error);

    setFeedStatus(
      "Eroare la încărcarea fotografiilor: " +
      error.message,
      true
    );
  }
}

async function addPhotoToFeed(photo) {
  var card =
    document.createElement("article");

  card.className = "photo-card";

  var image =
    document.createElement("img");

  image.alt = photo.name;
  image.loading = "lazy";

  var details =
    document.createElement("div");

  details.className = "photo-details";

  var name =
    document.createElement("p");

  name.className = "photo-name";
  name.textContent = photo.name;

  var date =
    document.createElement("p");

  date.className = "photo-date";
  date.textContent =
    formatDate(photo.created);

  details.appendChild(name);
  details.appendChild(date);

  card.appendChild(image);
  card.appendChild(details);
  feed.appendChild(card);

  try {
    var response = await fetch(
      BACKEND_URL +
      "?action=image&id=" +
      encodeURIComponent(photo.id) +
      "&t=" +
      Date.now()
    );

    var result = await response.json();

    if (!result.success) {
      throw new Error(
        result.error ||
        "Imaginea nu a putut fi încărcată."
      );
    }

    image.src =
      "data:" +
      result.mimeType +
      ";base64," +
      result.data;
  } catch (error) {
    console.error(error);
    image.alt = "Imagine indisponibilă";
    image.classList.add("image-error");
  }
}

function formatDate(value) {
  var date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleString(
    "ro-RO",
    {
      dateStyle: "medium",
      timeStyle: "short"
    }
  );
}

function stopCamera() {
  if (!stream) {
    return;
  }

  stream.getTracks().forEach(
    function(track) {
      track.stop();
    }
  );

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
