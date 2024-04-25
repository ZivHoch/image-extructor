const grabBtn = document.getElementById("grabBtn");
if (grabBtn) {
  grabBtn.addEventListener("click", () => {
    // Get active browser tab
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      var tab = tabs[0];
      if (tab) {
        execScript(tab);
      } else {
        alert("There are no active tabs");
      }
    });
  });
}

/**
 * Execute a grabImages() function on a web page,
 * opened on specified tab and on all frames of this page
 * @param {Object} tab - A tab to execute script on
 */
function execScript(tab) {
  // Execute a function on a page of the current browser tab
  // and process the result of execution
  chrome.scripting.executeScript(
    {
      target: { tabId: tab.id, allFrames: true },
      function: grabData,
    },
    onResult
  );
}

/**
 * Executed on a remote browser page to grab all images and title
 * and return their URLs and title
 *
 * @returns {Object} Object containing image URLs and title
 */
function grabData() {
  const images = document.querySelectorAll("img");
  const specificSizeImages = Array.from(images).filter((image) => {
    // Define the specific width and height criteria
    const specificWidth = 300; // Example width
    const specificHeight = 200; // Example height
    // Check if the image matches the specific size criteria
    return image.width >= specificWidth && image.height >= specificHeight;
  });
  // Get the title from the meta tag
  const titleMetaTag = document.querySelector('meta[name="twitter:title"]');
  const title = titleMetaTag ? titleMetaTag.getAttribute("content") : "Untitled";

  // Return the src of images that match the specific size criteria and the title
  return { images: specificSizeImages.map((image) => image.src), title: title };
}

/**
 * Executed after grabData() call finished on remote page
 * Combines results and opens a new tab to display UI
 *
 * @param {Array} frames - Array of grabData() function execution results
 */
function onResult(frames) {
  // If script execution failed on remote end and could not return results
  if (!frames || !frames.length) {
    alert("Could not retrieve data from specified page");
    return;
  }
  // Get the data from the first frame (assuming it's the main frame)
  const { images, title } = frames[0].result;
  openImagesPage(images, title);
}

function openImagesPage(urls, title) {
  // Open a new tab with a HTML page to display an UI
  chrome.tabs.create({ url: "page.html", active: false }, (tab) => {
    // Send `urls` array and `title` to this page
    setTimeout(() => {
      chrome.tabs.sendMessage(tab.id, { urls: urls, title: title }, (resp) => {
        chrome.tabs.update(tab.id, { active: true });
      });
    }, 500);
  });
}
