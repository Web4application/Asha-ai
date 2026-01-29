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
// 2️⃣ Fetch and Summarize Text
// ============================
async function fetchAndSummarize(url) {
    try {
        const res = await fetch(url);
        const text = await res.text();
        // Simple truncation summary (can replace with AI summary)
        return text.slice(0, 250) + (text.length > 250 ? "..." : "");
    } catch (e) {
        return "Unable to fetch or summarize content.";
    }
}

// ============================
// 3️⃣ Scan Media Recursively
// ============================
function scanMediaRecursive(root = document) {
    const mediaLinks = [...root.querySelectorAll("a")].filter(a =>
        a.href.match(/\.(mp3|m4a|wav|txt|srt)$/i)
    ).map(a => ({
        url: a.href,
        text: a.innerText.trim()
    }));

    const folders = [...root.querySelectorAll("a")].filter(a =>
        a.href.includes("/tree/")
    );

    for (const folder of folders) {
        mediaLinks.push(...scanMediaRecursive(folder.parentElement));
    }

    return mediaLinks;
}

// ============================
// 4️⃣ Play Audio Snippet
// ============================
function playAudio(url, duration = 10) {
    return new Promise((resolve) => {
        const audio = new Audio(url);
        audio.play();
        setTimeout(() => {
            audio.pause();
            resolve();
        }, duration * 1000);
    });
}

// ============================
// 5️⃣ Default Answer Generator
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
// 6️⃣ Main Assistant
// ============================
async function runUltimatePudteethAssistant() {
    const userInput = await getUserInput("Which media would you like me to explore?");
    if (!userInput) {
        completion({ media: [], message: "No input detected.", DLL: [] });
        return;
    }

    let style = "short";
    if (userInput.toLowerCase().includes("detail")) style = "detailed";
    else if (userInput.toLowerCase().includes("tech")) style = "technical";

    const mediaFiles = scanMediaRecursive();
    const count = mediaFiles.length;

    speak(getDefaultAnswer(count, style));

    const DLL = JSON.parse(localStorage.getItem("ai_DLL") || "[]");
    DLL.push({
        timestamp: Date.now(),
        userIntent: "Explore Media Recursively",
        userInput,
        style,
        mediaFiles,
        message: getDefaultAnswer(count, style)
    });
    localStorage.setItem("ai_DLL", JSON.stringify(DLL));

    // Interactive loop
    for (let i = 0; i < mediaFiles.length; i++) {
        const item = mediaFiles[i];
        speak(`Item ${i + 1}: ${item.text}, URL: ${item.url}`);

        if (item.url.match(/\.(txt|srt)$/i)) {
            const summary = await fetchAndSummarize(item.url);
            speak(`Transcript summary: ${summary}`);
        }

        if (item.url.match(/\.(mp3|m4a|wav)$/i)) {
            speak("Playing a short preview of the audio...");
            await playAudio(item.url, 10); // 10-second snippet
        }

        const command = await getUserInput("Say 'next', 'skip', 'stop', or 'summarize'.");
        const cmdLower = command.toLowerCase();
        if (cmdLower.includes("stop")) {
            speak("Stopping media exploration.");
            break;
        } else if (cmdLower.includes("skip")) {
            continue;
        } else if (cmdLower.includes("summarize") && item.url.match(/\.(txt|srt)$/i)) {
            const summary = await fetchAndSummarize(item.url);
            speak(`Full summary: ${summary}`);
        }
    }

    completion({ media: mediaFiles, message: getDefaultAnswer(count, style), DLL });
}

// ============================
// 7️⃣ Run Assistant
// ============================
runUltimatePudteethAssistant();