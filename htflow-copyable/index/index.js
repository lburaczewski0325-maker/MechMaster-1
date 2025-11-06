// --- API & Firebase Setup ---
        const apiKey = ""; // API key will be provided automatically in the canvas environment
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;

    // --- Core Utilities ---

        /**
         * Retries a fetch request with exponential backoff.
         * @param {string} url - The API endpoint URL.
         * @param {object} options - The fetch options (method, headers, body).
         * @param {number} retries - The number of remaining retries.
         */
        const fetchWithRetry = async (url, options, retries = 5) => {
            for (let i = 0; i < retries; i++) {
                try {
                    const response = await fetch(url, options);
                    if (response.status === 429 && i < retries - 1) {
                        // Too Many Requests, wait and retry
                        const delay = Math.pow(2, i) * 1000 + Math.random() * 1000;
                        await new Promise(resolve => setTimeout(resolve, delay));
                        continue;
                    }
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    return response;
                } catch (error) {
                    if (i === retries - 1) {
                        console.error("Fetch failed after multiple retries:", error);
                        throw error;
                    }
                }
            }
        };

        /**
         * Fetches repair instructions from the Gemini API.
         */
        const getInstructions = async () => {
            const carYear = document.querySelector('[data-ht-car-year]').value.trim();
            const carMake = document.querySelector('[data-ht-car-make]').value.trim();
            const carModel = document.querySelector('[data-ht-car-model]').value.trim();
            const partToFix = document.querySelector('[data-ht-part-to-fix]').value.trim();
            const instructionsOutput = document.querySelector('[data-ht-instructions-output]');
            const sourcesOutput = document.querySelector('[data-ht-sources-output]');
            const loadingIndicator = document.querySelector('[data-ht-loading-indicator]');
            const generateButton = document.querySelector('[data-ht-generate-button]');

            if (!carYear || !carMake || !carModel || !partToFix) {
                instructionsOutput.innerHTML = `<p class="text-red-500 font-semibold">Please fill in all vehicle and part details.</p>`;
                sourcesOutput.classList.add('hidden');
                return;
            }

            // UI State: Loading
            generateButton.disabled = true;
            generateButton.innerHTML = 'Searching...';
            loadingIndicator.classList.remove('hidden');
            instructionsOutput.innerHTML = '';
            sourcesOutput.classList.add('hidden');

            const userQuery = `Provide the tool list and detailed, numbered steps for replacing the ${partToFix} on a ${carYear} ${carMake} ${carModel}. Focus on clarity, safety, and conciseness.`;

            const systemPrompt = `You are a professional automotive technician and clear instructional writer. Your task is to provide concise, easy-to-follow, step-by-step instructions for performing a specific car repair. Structure the response clearly, starting with a 'Tools Required' section (a simple list) followed by 'Step-by-Step Procedure' (a numbered list). Do not include any conversational preamble, safety warnings, or lengthy explanations unless it is a necessary part of the first step. Focus only on the tools required and the procedural steps.`;


            const payload = {
                contents: [{ parts: [{ text: userQuery }] }],
                tools: [{ "google_search": {} }],
                systemInstruction: {
                    parts: [{ text: systemPrompt }]
                },
            };

            try {
                const response = await fetchWithRetry(apiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                const result = await response.json();
                const candidate = result.candidates?.[0];

                if (candidate && candidate.content?.parts?.[0]?.text) {
                    const text = candidate.content.parts[0].text;
                    let sources = [];

                    // 1. Extract and display the generated text
                    instructionsOutput.innerHTML = formatInstructions(text);

                    // 2. Extract and display grounding sources (citations)
                    const groundingMetadata = candidate.groundingMetadata;
                    if (groundingMetadata && groundingMetadata.groundingAttributions) {
                        sources = groundingMetadata.groundingAttributions
                            .map(attribution => ({
                                uri: attribution.web?.uri,
                                title: attribution.web?.title,
                            }))
                            .filter(source => source.uri && source.title);

                        displaySources(sources);
                    }

                } else {
                    instructionsOutput.innerHTML = `<p class="text-red-500 font-semibold">Could not find repair instructions. Please try a different part or vehicle combination.</p>`;
                }

            } catch (error) {
                console.error("API Call failed:", error);
                instructionsOutput.innerHTML = `<p class="text-red-500 font-semibold">An error occurred while fetching instructions. Please check your network connection.</p>`;
            } finally {
                // UI State: Done
                loadingIndicator.classList.add('hidden');
                generateButton.disabled = false;
                generateButton.innerHTML = 'Get Repair Instructions';
            }
        }

    /**
     * Simple formatter to format text for better display (e.g., handles bullet points and numbered lists).
     * @param {string} text - The raw text output from the API.
     * @returns {string} The HTML formatted text.
     */
        const formatInstructions = (text) => {
            // Replace markdown-style lists/steps with HTML structures
            let html = text.replace(/^\s*\*/gm, (match) => '•').replace(/^\s*(\d+)\./gm, (match, p1) => `${p1}.`);
            // Wrap in <pre> tags to preserve whitespace/line breaks and ensure numbered steps look correct
            return `<pre class="text-sm leading-relaxed">${html}</pre>`;
        };

        /**
         * Displays the list of grounding sources.
         * @param {Array<Object>} sources - Array of source objects {uri, title}.
         */
        const displaySources = (sources) => {
            const sourcesList = document.querySelector('[data-ht-sources-list]');
            const sourcesOutput = document.querySelector('[data-ht-sources-output]');

            if (sources.length > 0) {
                sourcesList.innerHTML = sources.map(source =>
                    `<li><a href="${source.uri}" target="_blank" rel="noopener noreferrer" class="source-link hover:text-blue-600 transition">${source.title || source.uri}</a></li>`
                ).join('');
                sourcesOutput.classList.remove('hidden');
            } else {
                sourcesOutput.classList.add('hidden');
            }
        };

    // Attach event listener to the button
    document.querySelector('[data-ht-generate-button]').addEventListener('click', getInstructions);
