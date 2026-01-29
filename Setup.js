// ============================
// 0️⃣ Helper: Speak Text
// ============================
function speak(message) {
    if("speechSynthesis" in window) {
        const utter = new SpeechSynthesisUtterance(message);
        speechSynthesis.speak(utter);
    }
}

// ============================
// 1️⃣ Helper: Voice Recognition
// ============================
async function getUserInput(promptMessage = "Please tell me what you want me to do.") {
    if(!('webkitSpeechRecognition' in window)) {
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

        recognition.onerror = () => resolve(""); // treat error as empty input

        recognition.start();
    });
}

// ============================
// 2️⃣ Default Answer Generator
// ============================
function getDefaultAnswer(style = "short", count = 0) {
    switch(style) {
        case "short":
            return `I found ${count} links on this page.`;
        case "detailed":
            return `This page contains ${count} links. Each link has a URL and visible text. You can read them aloud, export them, or process them further.`;
        case "technical":
            return `Extracted ${count} anchor elements with 'url' and 'text' properties in JSON format.`;
        default:
            return `I found ${count} links on this page.`;
    }
}

// ============================
// 3️⃣ Ask User Command & Retry If Empty
// ============================
async function getCommand() {
    let attempts = 0;
    let input = "";
    while(attempts < 2) { // retry up to 2 times
        input = await getUserInput();
        if(input) break;
        attempts++;
        speak("No input detected. Please say your command.");
    }
    return input;
}

// ============================
// 4️⃣ Main Shortcut
// ============================
async function runShortcut() {
    const userInput = await getCommand();
    if(!userInput) {
        completion({
            links: [],
            message: "No input provided after multiple attempts.",
            DLL: []
        });
        return;
    }

    // Determine answer style
    let style = "short";
    if(userInput.toLowerCase().includes("detail")) style = "detailed";
    else if(userInput.toLowerCase().includes("tech")) style = "technical";

    // Extract links
    const links = [...document.querySelectorAll("a")].map(a => ({
        url: a.href,
        text: a.innerText.trim()
    }));
    const count = links.length;

    // Generate summary message
    const message = getDefaultAnswer(style, count);
    speak(message);

    // DLL-style memory
    const DLL = JSON.parse(localStorage.getItem("ai_DLL") || "[]");
    DLL.push({
        timestamp: Date.now(),
        userIntent: "Extract Links",
        userInput: userInput,
        style: style,
        links: links,
        message: message
    });
    localStorage.setItem("ai_DLL", JSON.stringify(DLL));

    // ============================
    // 5️⃣ Read Links One by One
    // Voice interaction: say "next" to continue, "skip" to skip, "stop" to end
    // ============================
    for(let i = 0; i < links.length; i++) {
        const link = links[i];
        speak(`Link ${i+1}: ${link.text}, ${link.url}`);

        // Wait for user command (skip/stop) or small delay if no voice input
        const command = await getUserInput("Say 'next' to continue, 'skip' to skip, or 'stop' to end.");
        if(command.toLowerCase().includes("stop")) {
            speak("Stopping link reading.");
            break;
        }
        // else continue
    }

    // ============================
    // 6️⃣ Return Result
    // ============================
    completion({
        links: links,
        message: message,
        DLL: DLL
    });
}

// ============================
// 7️⃣ Run
// ============================
runShortcut();