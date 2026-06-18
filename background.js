const API_ENDPOINT = 'https://aisandbox-pa.googleapis.com/v1/projects';
const COOLDOWN_MIN = 10000; // 10 seconds
const COOLDOWN_MAX = 15000; // 15 seconds

let isProcessing = false;
let currentBatchId = null;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'startGeneration') {
    startGeneration(request.prompts, request.referenceImageData, request.downloadFolder)
      .then(() => sendResponse({ success: true }))
      .catch((error) => sendResponse({ success: false, error: error.message }));
    return true; // Will respond asynchronously
  } else if (request.action === 'stopGeneration') {
    isProcessing = false;
  }
});

async function startGeneration(prompts, referenceImageData, downloadFolder) {
  isProcessing = true;
  currentBatchId = generateBatchId();
  let downloadedCount = 0;

  try {
    // Get project ID from current tab
    const projectId = await getProjectId();
    if (!projectId) throw new Error('Could not extract project ID from Flow page');

    // Get auth token from page
    const token = await getAuthToken();
    if (!token) throw new Error('Could not obtain authentication token');

    // Get reCAPTCHA token
    const recaptchaToken = await getRecaptchaToken();
    if (!recaptchaToken) throw new Error('Could not obtain reCAPTCHA token');

    // Convert reference image to bytes
    const referenceImageBytes = await imageDataToBytes(referenceImageData);

    // Generate images for each prompt
    for (let i = 0; i < prompts.length; i++) {
      if (!isProcessing) break;

      const prompt = prompts[i];
      const seed = Math.floor(Math.random() * 1000000);

      try {
        // Call Flow API
        const payload = buildPayload(
          projectId,
          prompt,
          referenceImageBytes,
          recaptchaToken,
          seed
        );

        const response = await fetch(`${API_ENDPOINT}/${projectId}/flowMedia:batchGenerateImages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'Origin': 'https://labs.google',
            'Referer': 'https://labs.google/',
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          throw new Error(`API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const imageUrl = extractImageUrl(data);

        if (imageUrl) {
          // Download image
          const filename = `${downloadFolder}/image_${String(i + 1).padStart(3, '0')}.png`;
          await downloadImage(imageUrl, filename);
          downloadedCount++;
        }

        // Update progress
        chrome.runtime.sendMessage({
          action: 'updateProgress',
          current: i + 1,
          total: prompts.length,
        }).catch(() => {}); // Ignore if popup is closed

        // Random cooldown before next request (except for last one)
        if (i < prompts.length - 1) {
          const cooldown = Math.random() * (COOLDOWN_MAX - COOLDOWN_MIN) + COOLDOWN_MIN;
          await new Promise((resolve) => setTimeout(resolve, cooldown));
        }
      } catch (error) {
        console.error(`Error generating image for prompt "${prompt}":`, error);
        // Continue with next prompt
      }
    }

    // Send completion message
    chrome.runtime.sendMessage({
      action: 'generationComplete',
      total: prompts.length,
      downloaded: downloadedCount,
    }).catch(() => {});
  } catch (error) {
    console.error('Generation error:', error);
    chrome.runtime.sendMessage({
      action: 'generationError',
      error: error.message,
    }).catch(() => {});
  } finally {
    isProcessing = false;
  }
}

function buildPayload(projectId, prompt, referenceImageBytes, recaptchaToken, seed) {
  return {
    clientContext: {
      projectId,
      tool: 'PINHOLE',
      sessionId: `;${Date.now()}`,
      recaptchaContext: {
        token: recaptchaToken,
        applicationType: 'RECAPTCHA_APPLICATION_TYPE_WEB',
      },
    },
    mediaGenerationContext: {
      batchId: currentBatchId,
    },
    useNewMedia: true,
    requests: [
      {
        clientContext: {
          projectId,
          tool: 'PINHOLE',
          sessionId: `;${Date.now()}`,
          recaptchaContext: {
            token: recaptchaToken,
            applicationType: 'RECAPTCHA_APPLICATION_TYPE_WEB',
          },
        },
        imageModelName: 'NARWHAL', // Nano Banana 2
        imageAspectRatio: 'IMAGE_ASPECT_RATIO_PORTRAIT', // 9:16
        structuredPrompt: {
          parts: [{ text: prompt }],
        },
        seed,
        imageInputs: [
          {
            bytesBase64: referenceImageBytes,
          },
        ],
      },
    ],
  };
}

async function getProjectId() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const tab = tabs[0];

  // Extract from URL: /project/{projectId}
  const match = tab.url.match(/\/project\/([a-f0-9-]+)/);
  return match ? match[1] : null;
}

async function getAuthToken() {
  // Inject script to get token from page
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const tab = tabs[0];

  try {
    const result = await chrome.tabs.executeScript({
      target: { tabId: tab.id },
      function: () => {
        // Try to extract from Authorization header interceptor or local storage
        return window.__GOOGLE_ACCESS_TOKEN__ || localStorage.getItem('auth_token') || null;
      },
    });
    return result?.[0];
  } catch (error) {
    console.error('Error getting auth token:', error);
    return null;
  }
}

async function getRecaptchaToken() {
  // This needs to be obtained from the page's reCAPTCHA
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const tab = tabs[0];

  try {
    const result = await chrome.tabs.executeScript({
      target: { tabId: tab.id },
      function: async () => {
        // Execute reCAPTCHA
        if (window.grecaptcha) {
          return await new Promise((resolve) => {
            window.grecaptcha.ready(() => {
              window.grecaptcha.execute('recaptcha_key', { action: 'submit' }).then((token) => {
                resolve(token);
              });
            });
          });
        }
        return null;
      },
    });
    return result?.[0];
  } catch (error) {
    console.error('Error getting reCAPTCHA token:', error);
    return null;
  }
}

async function imageDataToBytes(dataUrl) {
  // Convert data URL to base64 string (without the data:image/png;base64, prefix)
  return dataUrl.split(',')[1];
}

function extractImageUrl(apiResponse) {
  // Parse the API response to extract the generated image URL
  try {
    // Response structure varies, but typically contains mediaUrlInfo or similar
    if (apiResponse.responses?.[0]?.mediaUrlInfo?.mediaUrl) {
      return apiResponse.responses[0].mediaUrlInfo.mediaUrl;
    }
    if (apiResponse.media?.[0]?.mediaUrl) {
      return apiResponse.media[0].mediaUrl;
    }
    console.warn('Could not extract image URL from response:', apiResponse);
    return null;
  } catch (error) {
    console.error('Error extracting image URL:', error);
    return null;
  }
}

async function downloadImage(imageUrl, filename) {
  return new Promise((resolve, reject) => {
    chrome.downloads.download(
      {
        url: imageUrl,
        filename,
        saveAs: false,
      },
      (downloadId) => {
        if (downloadId) {
          resolve(downloadId);
        } else {
          reject(new Error('Download failed'));
        }
      }
    );
  });
}

function generateBatchId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
