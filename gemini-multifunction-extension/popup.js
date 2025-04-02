const summarizeBtn = document.getElementById('summarizeBtn');
const explainBtn = document.getElementById('explainBtn');
const customPromptBtn = document.getElementById('customPromptBtn');
const customPromptInput = document.getElementById('customPrompt');
const resultDiv = document.getElementById('result');
const modelSelect = document.getElementById('modelSelect');
const customModelInputDiv = document.getElementById('customModelInputDiv');
const customModelInput = document.getElementById('customModelInput');

// --- Model Configuration ---
// Updated list based on the image provided
const AVAILABLE_MODELS = {
    "gemini-2.5-pro-exp-03-25": "gemini-2.5-pro-exp-03-25",
    "gemini-2.0-flash-001": "gemini-2.0-flash-001",
    "gemini-2.0-flash-lite-preview-02-05": "gemini-2.0-flash-lite-preview-02-05",
    "gemini-2.0-pro-exp-02-05": "gemini-2.0-pro-exp-02-05",
    "gemini-2.0-flash-thinking-exp-01-21": "gemini-2.0-flash-thinking-exp-01-21",
    "gemini-2.0-flash-thinking-exp-1219": "gemini-2.0-flash-thinking-exp-1219",
    "gemini-2.0-flash-exp": "gemini-2.0-flash-exp",
    // Add back the stable ones for practicality, can be removed if strictly adhering to image
    "gemini-1.5-pro-latest": "gemini-1.5-pro-latest (Stable)",
    "gemini-1.5-flash-latest": "gemini-1.5-flash-latest (Stable)",
    "__custom__": "Enter Custom Model..." // Special value for custom input
};
const DEFAULT_MODEL_ID = "gemini-2.5-pro-exp-03-25"; // Default if nothing is saved
const CUSTOM_MODEL_KEY = "__custom__";

// --- Helper Functions ---

// Function to display loading state
function showLoading() {
    resultDiv.innerHTML = '<div class="loading">Processing...</div>';
}

// Function to display results or errors
function displayResult(text, isError = false) {
    resultDiv.textContent = text;
    resultDiv.className = isError ? 'error' : '';
}

// --- Model Selection Logic ---

// Populate the dropdown
function populateModelSelector() {
    // Clear existing options first
    modelSelect.innerHTML = '';
    for (const modelId in AVAILABLE_MODELS) {
        const option = document.createElement('option');
        option.value = modelId;
        option.textContent = AVAILABLE_MODELS[modelId];
        modelSelect.appendChild(option);
    }
}

// Load saved model selection or set default
async function loadModelSelection() {
    try {
        // Load both the selected dropdown value and the custom input value
        const data = await chrome.storage.local.get(['selectedModel', 'customModelName']);
        const savedSelection = data.selectedModel;
        const savedCustomName = data.customModelName || '';

        if (savedSelection === CUSTOM_MODEL_KEY) {
            modelSelect.value = CUSTOM_MODEL_KEY;
            customModelInput.value = savedCustomName;
            customModelInputDiv.style.display = 'block'; // Show custom input
        } else if (savedSelection && AVAILABLE_MODELS[savedSelection]) {
            modelSelect.value = savedSelection;
            customModelInputDiv.style.display = 'none'; // Hide custom input
        } else {
            // Fallback to default if nothing valid is saved
            modelSelect.value = DEFAULT_MODEL_ID;
            customModelInputDiv.style.display = 'none';
            await chrome.storage.local.set({ selectedModel: DEFAULT_MODEL_ID, customModelName: '' });
        }
    } catch (error) {
        console.error("Error loading model selection:", error);
        modelSelect.value = DEFAULT_MODEL_ID; // Fallback to default
        customModelInputDiv.style.display = 'none';
    }
}

// Save model selection when changed (dropdown or custom input)
async function saveModelSelection() {
    const selectedDropdownValue = modelSelect.value;
    const customModelName = customModelInput.value.trim();
    try {
        if (selectedDropdownValue === CUSTOM_MODEL_KEY) {
            await chrome.storage.local.set({ selectedModel: CUSTOM_MODEL_KEY, customModelName: customModelName });
            console.log("Model selection saved: Custom =", customModelName);
        } else {
            await chrome.storage.local.set({ selectedModel: selectedDropdownValue, customModelName: '' }); // Clear custom name if dropdown used
            console.log("Model selection saved: Dropdown =", selectedDropdownValue);
        }
    } catch (error) {
        console.error("Error saving model selection:", error);
    }
}

// Handle dropdown changes
modelSelect.addEventListener('change', () => {
    if (modelSelect.value === CUSTOM_MODEL_KEY) {
        customModelInputDiv.style.display = 'block';
        customModelInput.focus();
    } else {
        customModelInputDiv.style.display = 'none';
    }
    saveModelSelection(); // Save whenever dropdown changes
});

// Save when custom input changes
customModelInput.addEventListener('input', saveModelSelection);


// --- Action Event Listeners ---

// Helper to get the effective model name
function getSelectedModel() {
    if (modelSelect.value === CUSTOM_MODEL_KEY) {
        return customModelInput.value.trim() || FALLBACK_MODEL; // Use fallback if custom is empty
    }
    return modelSelect.value || DEFAULT_MODEL_ID; // Use default if somehow dropdown is empty
}

summarizeBtn.addEventListener('click', () => {
    showLoading();
    const selectedModel = getSelectedModel();
    // Send message to background script to summarize the current page
    chrome.runtime.sendMessage({ action: 'summarizePage', model: selectedModel }, (response) => {
        if (chrome.runtime.lastError) {
            displayResult(`Error: ${chrome.runtime.lastError.message}`, true);
        } else if (response.error) {
            displayResult(`API Error: ${response.error}`, true);
        } else {
            displayResult(response.result);
        }
    });
});

explainBtn.addEventListener('click', () => {
    showLoading();
    const selectedModel = getSelectedModel();
    // Send message to background script to explain selected text
    // Note: Getting selected text requires content script injection,
    // which will be handled in background.js
    chrome.runtime.sendMessage({ action: 'explainSelection', model: selectedModel }, (response) => {
         if (chrome.runtime.lastError) {
            displayResult(`Error: ${chrome.runtime.lastError.message}`, true);
        } else if (response.error) {
            displayResult(`API Error: ${response.error}`, true);
        } else if (response.noSelection) {
             displayResult("Error: No text selected on the page.", true);
        }
         else {
            displayResult(response.result);
        }
    });
});

customPromptBtn.addEventListener('click', () => {
    const prompt = customPromptInput.value.trim();
    if (!prompt) {
        displayResult('Error: Please enter a custom prompt.', true);
        return;
    }
    showLoading();
    const selectedModel = getSelectedModel();
    // Send message to background script to run the custom prompt
    chrome.runtime.sendMessage({ action: 'runCustomPrompt', prompt: prompt, model: selectedModel }, (response) => {
        if (chrome.runtime.lastError) {
            displayResult(`Error: ${chrome.runtime.lastError.message}`, true);
        } else if (response.error) {
            displayResult(`API Error: ${response.error}`, true);
        } else {
            displayResult(response.result);
        }
    });
});

// Optional: Clear placeholder on focus
customPromptInput.addEventListener('focus', () => {
    if (customPromptInput.placeholder) {
        customPromptInput.placeholder = '';
    }
});

// Optional: Restore placeholder if empty on blur
customPromptInput.addEventListener('blur', () => {
    if (!customPromptInput.value.trim()) {
        customPromptInput.placeholder = 'Enter your custom prompt here...';
    }
});

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    populateModelSelector();
    loadModelSelection(); // Load saved selection after populating
});
