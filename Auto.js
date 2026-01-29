// ============================
// 0️⃣ Helper: Speak Text
// ============================
function speak(message) {
    if ("speechSynthesis" in window) {
        const utter = new SpeechSynthesisUtterance(message);
        speechSynthesis.speak(utter);
    }
}

// ============================
// 1️⃣ Voice Recognition Helper
// ============================
async function getUserInput(promptMessage = "Please tell me what you want me to do.") {
    if (!('webkitSpeechRecognition' in window)) {
        speak("Voice recognition is not supported in this browser.");
        return "";
    }
    return new Promise((resolve) => {
        const recognition = new webkitSpeechRecognition();
        recognition.lang = "en-US";
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        speak(promptMessage);

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript.trim();
            resolve(transcript);
        };

        recognition.onerror = () => resolve(""); 
        recognition.start();
    });
}

// ============================
// 2️⃣ Default Answer Generator
// ============================
function getDefaultAnswer(count, style = "short") {
    switch (style) {
        case "short":
            return `I found ${count} media items in Pudteeth.`;
        case "detailed":
            return `This repository contains ${count} podcasts, interviews, or transcripts. I can read or summarize them interactively.`;
        case "technical":
            return `Extracted ${count} media/transcript elements with 'url' and 'text' properties.`;
        default:
            return `I found ${count} media items in Pudteeth.`;
    }
}

// ============================
// 3️⃣ Ask User Command & Retry
// ============================
async function getCommand() {
    let attempts = 0;
    let input = "";
    while (attempts < 2) {
        input = await getUserInput();
        if (input) break;
        attempts++;
        speak("No input detected. Please say your command.");
    }
    return input;
}

// ============================
// 4️⃣ Recursive Media Scanner
// ============================
function scanMediaRecursive(root = document) {
    // Collect all audio and transcript links
    const mediaLinks = [...root.querySelectorAll("a")].filter(a =>
        a.href.match(/\.(mp3|m4a|wav|txt|srt)$/i)
    ).map(a => ({
        url: a.href,
        text: a.innerText.trim()
    }));

    // Look for folder links (GitHub folders or submodules)
    const folders = [...root.querySelectorAll("a")].filter(a =>
        a.href.includes("/tree/") // GitHub folder URL pattern
    );

    // Recursively scan each folder if accessible in DOM
    for (const folder of folders) {
        // Only scan folders already loaded on page
        // Note: Full recursive scan for non-loaded folders may require GitHub API
        mediaLinks.push(...scanMediaRecursive(folder.parentElement));
    }

    return mediaLinks;
}

// ============================
// 5️⃣ Main Interactive Assistant
// ============================
async function runMediaAssistantRecursive() {
    const userInput = await getCommand();
    if (!userInput) {
        completion({
            media: [],
            message: "No input provided after multiple attempts.",
            DLL: []
        });
        return;
    }

    // Determine response style
    let style = "short";
    if (userInput.toLowerCase().includes("detail")) style = "detailed";
    else if (userInput.toLowerCase().includes("tech")) style = "technical";

    // Scan recursively
    const mediaFiles = scanMediaRecursive();
    const count = mediaFiles.length;

    // Speak summary
    const message = getDefaultAnswer(count, style);
    speak(message);

    // DLL memory
    const DLL = JSON.parse(localStorage.getItem("ai_DLL") || "[]");
    DLL.push({
        timestamp: Date.now(),
        userIntent: "Explore Media Recursively",
        userInput: userInput,
        style: style,
        mediaFiles: mediaFiles,
        message: message
    });
    localStorage.setItem("ai_DLL", JSON.stringify(DLL));

    // ============================
    // 6️⃣ Interactive Reading of Media
    // ============================
    for (let i = 0; i < mediaFiles.length; i++) {
        const item = mediaFiles[i];
        speak(`Item ${i + 1}: ${item.text}, URL: ${item.url}`);

        // Optional: summarize transcripts (text/srt)
        if (item.url.match(/\.(txt|srt)$/i)) {
            const res = await fetch(item.url);
            const textContent = await res.text();
            speak(`Summary: ${textContent.slice(0, 150)}...`);
        }

        // Wait for user command
        const command = await getUserInput("Say 'next' to continue, 'skip' to skip, or 'stop' to end.");
        if (command.toLowerCase().includes("stop")) {
            speak("Stopping media exploration.");
            break;
        }
    }

    // ============================
    // 7️⃣ Return Result
    // ============================
    completion({
        media: mediaFiles,
        message: message,
        DLL: DLL
    });
}

// ============================
// 8️⃣ Run Assistant
// ============================
runMediaAssistantRecursive();