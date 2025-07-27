const display = document.getElementById("display");
const buttons = document.querySelectorAll(".btn");

let clickSound = null;
let clearSound = null;

function initializeSounds() {
  if (!clickSound) clickSound = new Audio("click.mp3");
  if (!clearSound) clearSound = new Audio("clean.mp3");
}

function playClickSound() {
  if (clickSound) {
    clickSound.currentTime = 0;
    clickSound.play().catch((err) => console.warn("Click sound failed:", err));
  }
}

function playClearSound() {
  if (clearSound) {
    clearSound.currentTime = 0;
    clearSound.play().catch((err) => console.warn("Clear sound failed:", err));
  }
}

let lastExpression = "";
let lastOperator = "";
let lastOperand = "";
let userStartedTyping = false;

function evaluateExpression() {
  try {
    const result = eval(display.value);
    display.value = result;
    return result;
  } catch {
    display.value = "Error";
    return null;
  }
}

// Button clicks
buttons.forEach((button) => {
  button.addEventListener("click", () => {
    initializeSounds();
    const value = button.textContent;

    if (!userStartedTyping && value !== "C" && value !== "=") {
      display.value = "";
      userStartedTyping = true;
    }

    if (value === "C") {
      playClearSound();
      display.value = "";
      lastExpression = "";
      lastOperator = "";
      lastOperand = "";
      userStartedTyping = false;
    } else if (value === "=") {
      playClickSound();
      if (display.value === "" && lastExpression !== "") {
        display.value = eval(lastExpression);
        lastExpression = display.value + lastOperator + lastOperand;
      } else {
        const match = display.value.match(/(-?\d+)([\+\-\*\/])(-?\d+)$/);
        if (match) {
          lastOperator = match[2];
          lastOperand = match[3];
        }
        lastExpression = display.value;
        evaluateExpression();
      }
    } else {
      playClickSound();
      display.value += value;
    }
  });
});

// Keyboard input
document.addEventListener("keydown", (event) => {
  initializeSounds();
  const key = event.key;

  if (/[\d+\-*/.]/.test(key)) {
    playClickSound();
    if (!userStartedTyping) {
      display.value = "";
      userStartedTyping = true;
    }
    display.value += key;
  } else if (key === "Enter") {
    event.preventDefault();
    playClickSound();

    if (display.value === "" && lastExpression !== "") {
      display.value = eval(lastExpression);
      lastExpression = display.value + lastOperator + lastOperand;
    } else {
      const match = display.value.match(/(-?\d+)([\+\-\*\/])(-?\d+)$/);
      if (match) {
        lastOperator = match[2];
        lastOperand = match[3];
      }
      lastExpression = display.value;
      evaluateExpression();
    }
  } else if (key === "Backspace") {
    playClickSound();
    display.value = display.value.slice(0, -1);
  } else if (key === "Escape" || key.toLowerCase() === "c") {
    playClearSound();
    display.value = "";
    lastExpression = "";
    lastOperator = "";
    lastOperand = "";
    userStartedTyping = false;
  }
});

// Dark mode toggle
const themeToggle = document.getElementById("toggle");
if (themeToggle) {
  themeToggle.addEventListener("change", () => {
    document.body.classList.toggle("dark-theme", themeToggle.checked);
  });
}

// 🎙️ Voice Assistant + Lottie
const micContainer = document.getElementById("mic-lottie");

if (window.SpeechRecognition || window.webkitSpeechRecognition) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = new SpeechRecognition();
  recognition.lang = "en-US";
  recognition.continuous = false;
  recognition.interimResults = false;

  const micAnimation = lottie.loadAnimation({
    container: micContainer,
    renderer: "svg",
    loop: false,
    autoplay: false,
    path: "mic.json" // Replace with your Lottie JSON path
  });

  micContainer.addEventListener("click", () => {
    speak("Let's start");
    micAnimation.goToAndPlay(0, true);
    micContainer.classList.add("pulsing");
    recognition.start();
  });

  recognition.onresult = function (event) {
    const speech = event.results[0][0].transcript.toLowerCase();
    const expression = convertSpeechToMath(speech);
    if (expression) {
      display.value = expression;
      const result = evaluateExpression();
      speakAnswer(result);
    } else {
      display.value = "Invalid voice input";
    }
  };

  recognition.onerror = function (event) {
    micContainer.classList.remove("pulsing");
    alert("🎤 Error: " + event.error);
  };

  recognition.onend = () => {
    micContainer.classList.remove("pulsing");
  };
}

// Convert voice to expression
function convertSpeechToMath(speech) {
  return speech
    .replace(/plus/g, "+")
    .replace(/minus/g, "-")
    .replace(/times|into|x/g, "*")
    .replace(/divided by|by/g, "/")
    .replace(/ /g, "");
}

// 🔊 Voice configuration
let selectedVoice = null;

function setPreferredVoice() {
  const voices = window.speechSynthesis.getVoices();

  // Example: Pick a specific English female voice (change this as needed)
  selectedVoice = voices.find(
    (voice) => voice.lang === "en-US" && voice.name.includes("Female")
  ) || voices[0];

  if (!selectedVoice) {
    console.warn("No preferred voice found, using default.");
  }
}

// Chrome loads voices asynchronously
if (speechSynthesis.onvoiceschanged !== undefined) {
  speechSynthesis.onvoiceschanged = setPreferredVoice;
} else {
  setPreferredVoice();
}

// Speak helpers
function speak(message) {
  const utter = new SpeechSynthesisUtterance(message);
  if (selectedVoice) {
    utter.voice = selectedVoice;
  }
  window.speechSynthesis.speak(utter);
}

function speakAnswer(result) {
  if (result !== null && result !== "Error") {
    speak("The answer is " + result);
  } else {
    speak("Sorry, I couldn't calculate that");
  }
}
