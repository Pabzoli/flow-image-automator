document.addEventListener('DOMContentLoaded', () => {
  const referenceInput = document.getElementById('referenceImage');
  const promptsInput = document.getElementById('promptsInput');
  const downloadFolderInput = document.getElementById('downloadFolder');
  const startButton = document.getElementById('startButton');
  const stopButton = document.getElementById('stopButton');
  const statusDiv = document.getElementById('status');
  const progressContainer = document.getElementById('progress');
  const progressFill = document.getElementById('progressFill');
  const progressText = document.getElementById('progressText');

  let isProcessing = false;
  let referenceImageData = null;

  // Load saved data
  chrome.storage.local.get(['referenceImageData', 'downloadFolder'], (result) => {
    if (result.referenceImageData) {
      referenceImageData = result.referenceImageData;
      displayReferencePreview();
    }
    if (result.downloadFolder) {
      downloadFolderInput.value = result.downloadFolder;
    }
  });

  // Handle reference image upload
  referenceInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        referenceImageData = event.target.result; // base64
        chrome.storage.local.set({ referenceImageData });
        displayReferencePreview();
        showStatus('Reference image uploaded ✓', 'success');
      };
      reader.readAsDataURL(file);
    }
  });

  function displayReferencePreview() {
    const previewContainer = document.querySelector('.preview-container');
    previewContainer.innerHTML = `
      <img src="${referenceImageData}" alt="Reference Image Preview" />
      <p>Reference image loaded</p>
    `;
  }

  // Start generation
  startButton.addEventListener('click', async () => {
    // Validate inputs
    if (!referenceImageData) {
      showStatus('❌ Please upload a reference image', 'error');
      return;
    }

    const prompts = promptsInput.value
      .split('\n')
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    if (prompts.length === 0) {
      showStatus('❌ Please enter at least one prompt', 'error');
      return;
    }

    const downloadFolder = downloadFolderInput.value.trim() || 'flow-images';

    isProcessing = true;
    startButton.style.display = 'none';
    stopButton.style.display = 'block';
    progressContainer.style.display = 'block';
    showStatus(`🚀 Starting generation for ${prompts.length} prompts...`, 'info');

    // Send to background worker
    chrome.runtime.sendMessage(
      {
        action: 'startGeneration',
        prompts,
        referenceImageData,
        downloadFolder,
      },
      (response) => {
        if (response?.success) {
          showStatus('✓ Generation started', 'success');
        } else {
          showStatus(`❌ Error: ${response?.error}`, 'error');
          resetUI();
        }
      }
    );
  });

  // Stop generation
  stopButton.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'stopGeneration' });
    isProcessing = false;
    resetUI();
    showStatus('⏹️ Generation stopped', 'info');
  });

  // Listen for progress updates
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'updateProgress') {
      const { current, total } = request;
      const percentage = (current / total) * 100;
      progressFill.style.width = `${percentage}%`;
      progressText.textContent = `Generating image ${current} of ${total}...`;
    } else if (request.action === 'generationComplete') {
      const { total, downloaded } = request;
      showStatus(`✓ Complete! ${downloaded}/${total} images downloaded`, 'success');
      resetUI();
    } else if (request.action === 'generationError') {
      showStatus(`❌ Error: ${request.error}`, 'error');
      resetUI();
    }
  });

  function showStatus(message, type) {
    statusDiv.textContent = message;
    statusDiv.className = `status ${type}`;
  }

  function resetUI() {
    isProcessing = false;
    startButton.style.display = 'block';
    stopButton.style.display = 'none';
    progressContainer.style.display = 'none';
    progressFill.style.width = '0%';
  }
});
