// Store the API key provided by the user during setup
// IMPORTANT: Replace 'YOUR_API_KEY_HERE' with the actual key before loading the extension
const API_KEY = 'AIzaSyAj2_e8jTvf0g1pmkN4c1TlhlCw16onZfQ'; // User provided key
// Default model if none is specified in the request (shouldn't happen with current popup.js)
const FALLBACK_MODEL = 'gemini-1.5-pro-latest';

// Store API key on installation (or update)
chrome.runtime.onInstalled.addListener(async (details) => {
    if (details.reason === 'install' || details.reason === 'update') {
        try {
            await chrome.storage.local.set({ apiKey: API_KEY });
            console.log('Gemini API Key stored.');
        } catch (error) {
            console.error('Error storing API key:', error);
        }
    }
});

// Function to call the Gemini API
async function callGeminiAPI(prompt, context = "", modelName = FALLBACK_MODEL) {
    const fullPrompt = context ? `${context}\n\n${prompt}` : prompt;
    // Construct API URL dynamically based on the model name passed
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${API_KEY}`;
    console.log(`Calling Gemini (${modelName}) with prompt length ${fullPrompt.length}:`, prompt); // Log model and prompt

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{ parts: [{ text: fullPrompt }] }],
                // Add safety settings if needed, e.g.:
                // safetySettings: [
                //   { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
                //   // ... other categories
                // ],
                generationConfig: {
                    // Configure temperature, topP, topK, maxOutputTokens etc. if desired
                    temperature: 0.7,
                    maxOutputTokens: 1024,
                }
            }),
        });

        if (!response.ok) {
            const errorBody = await response.json();
            console.error('API Error Response:', errorBody);
            throw new Error(`API request failed with status ${response.status}: ${errorBody.error?.message || 'Unknown error'}`);
        }

        const data = await response.json();
        console.log("Raw API Response:", JSON.stringify(data, null, 2)); // Log the full response for debugging

        // Check for explicit blocks first
        if (data.promptFeedback?.blockReason) {
            throw new Error(`Request blocked due to safety settings: ${data.promptFeedback.blockReason}`);
        }

        // Check if candidates exist and have the expected structure
        if (data.candidates && data.candidates.length > 0) {
            const candidate = data.candidates[0];
            // Check for safety blocks within the candidate
            if (candidate.finishReason === 'SAFETY') {
                 throw new Error(`Response blocked by safety filters. Categories: ${candidate.safetyRatings?.map(r => r.category).join(', ')}`);
            }
            // Check if the expected content path exists
            if (candidate.content?.parts?.[0]?.text) {
                return candidate.content.parts[0].text;
            }
        }

        // If we reach here, the format is unexpected or lacks content
        console.error('Unexpected API response format or missing content:', data);
        // Provide a more specific error based on what might be missing
        if (!data.candidates || data.candidates.length === 0) {
             throw new Error('Invalid response format from API: No candidates found.');
        } else {
             throw new Error('Invalid response format from API: Could not extract text from candidate.');
        }

    } catch (error) {
        // Log the specific error before re-throwing
        console.error('Error during Gemini API call or processing:', error);
        throw error; // Re-throw the error to be caught by the message listener
    }
}

// Function to get content from the active tab
async function getPageContent(tabId) {
    try {
        const results = await chrome.scripting.executeScript({
            target: { tabId: tabId },
            func: () => document.body.innerText, // Extract text content
        });
        // Check if injection was successful and returned a result
        if (results && results[0] && results[0].result) {
            return results[0].result;
        } else {
            console.error("Content script injection failed or returned no result:", results);
            // Attempt to get basic info if body.innerText fails (e.g., for non-HTML pages)
             const tab = await chrome.tabs.get(tabId);
             return `Content could not be fully extracted. Page Title: ${tab.title}, URL: ${tab.url}`;
            // throw new Error("Could not retrieve page content.");
        }
    } catch (error) {
        console.error("Error executing script:", error);
        // Attempt to get basic info as fallback
        try {
             const tab = await chrome.tabs.get(tabId);
             return `Content could not be fully extracted due to an error (${error.message}). Page Title: ${tab.title}, URL: ${tab.url}`;
        } catch (tabError) {
             console.error("Error getting tab info:", tabError);
             throw new Error(`Could not retrieve page content or tab info: ${error.message}`);
        }
    }
}

// Function to get selected text from the active tab
async function getSelectedText(tabId) {
     try {
        const results = await chrome.scripting.executeScript({
            target: { tabId: tabId },
            func: () => window.getSelection().toString(),
        });
        if (results && results[0] && results[0].result) {
            return results[0].result;
        } else {
            return null; // No text selected or injection failed
        }
    } catch (error) {
        console.error("Error getting selected text:", error);
        return null;
    }
}


// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // Ensure the message is from our extension's popup
    // Note: In MV3, sender.tab is often undefined for popup messages.
    // Relying on the message structure might be sufficient for simple cases.

    if (request.action === 'summarizePage') {
        (async () => {
            try {
                const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
                if (!tab || !tab.id) throw new Error("Could not get active tab.");
                if (tab.url?.startsWith('chrome://')) {
                     sendResponse({ error: "Cannot summarize internal Chrome pages." });
                     return;
                }

                let pageContent = await getPageContent(tab.id);
                const maxChars = 5000; // Limit input size further
                let prompt = "Summarize the following text from a webpage:";

                if (pageContent.length > maxChars) {
                    pageContent = pageContent.slice(0, maxChars);
                    prompt += " (Note: The content was truncated due to length)";
                    console.log(`Summarize Page: Content truncated to ${maxChars} characters.`);
                }

                // Use the model specified in the request
                const summary = await callGeminiAPI(prompt, pageContent, request.model);
                sendResponse({ result: summary });
            } catch (error) {
                console.error("Summarize Error:", error);
                sendResponse({ error: error.message });
            }
        })();
        return true; // Indicates asynchronous response
    }

    if (request.action === 'explainSelection') {
         (async () => {
            try {
                const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
                 if (!tab || !tab.id) throw new Error("Could not get active tab.");
                 if (tab.url?.startsWith('chrome://')) {
                     sendResponse({ error: "Cannot access content on internal Chrome pages." });
                     return;
                 }

                const selectedText = await getSelectedText(tab.id);
                if (!selectedText) {
                    sendResponse({ noSelection: true });
                    return;
                }
                const prompt = "Explain the following selected text:";
                 // Use the model specified in the request
                const explanation = await callGeminiAPI(prompt, selectedText, request.model);
                sendResponse({ result: explanation });
            } catch (error) {
                console.error("Explain Selection Error:", error);
                sendResponse({ error: error.message });
            }
        })();
        return true; // Indicates asynchronous response
    }


    if (request.action === 'runCustomPrompt') {
        (async () => {
            try {
                // Optionally get page context or selection if needed for the custom prompt
                 // Use the model specified in the request
                const result = await callGeminiAPI(request.prompt, "", request.model);
                sendResponse({ result: result });
            } catch (error) {
                console.error("Custom Prompt Error:", error);
                sendResponse({ error: error.message });
            }
        })();
        return true; // Indicates asynchronous response
    }

    // Handle other potential messages if needed

    return false; // Default case for synchronous messages or unhandled actions
});

console.log('Gemini Multifunction Assistant background script loaded.');
