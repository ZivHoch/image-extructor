var title = "images";
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  addImagesToContainer(message.urls);
  title = message.title;
  sendResponse("OK");
});

function addImagesToContainer(urls) {
  const container = document.querySelector(".container");
  if (!container || !urls || !urls.length) return;

  urls.forEach((url) => addImageNode(container, url));
}

function addImageNode(container, url) {
  const div = document.createElement("div");
  div.className = "imageDiv";

  const img = document.createElement("img");
  img.src = url;

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.setAttribute("url", url);
  checkbox.checked = true;

  div.appendChild(img);
  div.appendChild(checkbox);
  container.appendChild(div);
}

document.getElementById("selectAll").addEventListener("change", (event) => {
  const items = document.querySelectorAll(".container input");
  items.forEach((item) => (item.checked = event.target.checked));
});

document.getElementById("downloadBtn").addEventListener("click", async () => {
  try {
    const urls = getSelectedUrls();
    const archive = await createArchive(urls);
    downloadArchive(archive);
  } catch (err) {
    alert(err.message);
  }
});

document.getElementById("downloadPDFBtn").addEventListener("click", async () => {
  try {
    const urls = getSelectedUrls();
    const archive = await createPdfFromImages(urls);
    downloadArchive(archive);
  } catch (err) {
    alert(err.message);
  }
});

function getSelectedUrls() {
  const urls = Array.from(document.querySelectorAll(".container input:checked")).map((item) => item.getAttribute("url"));
  if (!urls.length) throw new Error("Please, select at least one image");
  return urls;
}

async function createArchive(urls) {
  const zip = new JSZip();
  const errors = [];
  const fetchOptions = { timeout: 1000, mode: "no-cors" };

  for (let [index, url] of urls.entries()) {
    try {
      const response = await caches.match(url);
      const blob = response ? await response.blob() : await fetch(url, fetchOptions).then((res) => res.blob());
      const name = checkAndGetFileName(index, blob);
      zip.file(name, blob);
    } catch (err) {
      console.error(err);
      errors.push(err);
    }
  }

  if (errors.length > 0) console.error(`${errors.length} errors occurred while processing images.`);
  return zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 9 } });
}

function checkAndGetFileName(index, blob) {
  const name = parseInt(index) + 1;
  const [type, extension] = blob.type.split("/");
  if (type !== "image" || blob.size <= 0) throw Error("Incorrect content");
  return name + "." + extension.split("+")[0];
}

function downloadArchive(archive) {
  const url = URL.createObjectURL(archive);
  file_name = title + ".zip";
  chrome.downloads.download({ url, filename: file_name, saveAs: false }, () => URL.revokeObjectURL(url));
}

async function createPdfFromImages(urls) {
  const doc = new window.jspdf.jsPDF();
  const fetchOptions = { timeout: 100, mode: "no-cors" };
  isFirst = true;
  for (let url of urls) {
    try {
      const response = await caches.match(url);
      const blob = response ? await response.blob() : await fetch(url, fetchOptions).then((res) => res.blob());
      const imageData = await blobToDataURL(blob);
      const isSVG = imageData.startsWith("data:image/svg+xml");
      if (isSVG) {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        const image = new Image();
        image.src = imageData;
        await new Promise((resolve, reject) => {
          image.onload = resolve;
          image.onerror = reject;
        });
        canvas.width = image.width;
        canvas.height = image.height;
        ctx.drawImage(image, 0, 0);
        const png = canvas.toDataURL("image/png", 100);

        if (!isFirst) {
          doc.addPage();
        }
        doc.addImage(png, "PNG", 0, 0, 210, 300);
        isFirst = false;
      } else {
        if (!isFirst) {
          doc.addPage();
        }
        doc.addImage(imageData, "PNG", 0, 0, 210, 300);
        isFirst = false;
      }
    } catch (error) {
      console.error("Error creating PDF from image:", error);
      throw error;
    }
  }

  return doc.output("blob");
}

async function blobToDataURL(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
