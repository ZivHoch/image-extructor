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
      function: grabImages,
    },
    onResult
  );
}

/**
 * Executed on a remote browser page to grab all images
 * and return their URLs
 *
 * @returns {Array} Array of image URLs
 */
function grabImages() {
  const images = document.querySelectorAll("img");
  const specificSizeImages = Array.from(images).filter((image) => {
    // Define the specific width and height criteria
    const specificWidth = 300; // Example width
    const specificHeight = 200; // Example height
    // Check if the image matches the specific size criteria
    return image.width >= specificWidth && image.height >= specificHeight;
  });
  // Return the src of images that match the specific size criteria
  return specificSizeImages.map((image) => image.src);
}

/**
 * Executed after all grabImages() calls finished on
 * remote page
 * Combines results and copy a list of image URLs
 * to clipboard
 *
 * @param {Array} frames - Array of grabImage() function execution results
 */
function onResult(frames) {
  // If script execution failed on remote end
  // and could not return results
  if (!frames || !frames.length) {
    alert("Could not retrieve images from specified page");
    return;
  }
  // Combine arrays of image URLs from
  // each frame to a single array
  const imageUrls = frames.map((frame) => frame.result).flat();
  openImagesPage(imageUrls);
}
function openImagesPage(urls) {
  // TODO:
  // * Open a new tab with a HTML page to display an UI
  chrome.tabs.create({ url: "page.html", active: false }, (tab) => {
    // * Send `urls` array to this page
    setTimeout(() => {
      chrome.tabs.sendMessage(tab.id, urls, (resp) => {
        chrome.tabs.update(tab.id, { active: true });
      });
    }, 500);
  });
}
