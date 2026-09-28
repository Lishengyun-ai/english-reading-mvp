const textInput = document.querySelector("#text-input");
const charCount = document.querySelector("#char-count");
const sentencePreview = document.querySelector("#sentence-preview");
const quote = document.querySelector("#quote");
const clearText = document.querySelector("#clear-text");
const speakButton = document.querySelector("#speak-button");
const recordButton = document.querySelector("#record-button");
const recordLabel = document.querySelector("#record-label");
const recordState = document.querySelector("#record-state");
const feedbackPanel = document.querySelector("#feedback-panel");
const retryButton = document.querySelector("#retry-button");
const accent = document.querySelector("#accent");
const speed = document.querySelector("#speed");

let recorder;
let recordingTimer;
let recordingSeconds = 0;

function updateText() {
  const text = textInput.value.trim();
  charCount.textContent = `${textInput.value.length} / 2000`;
  sentencePreview.textContent = text || "输入一句英文后，这里会显示分句预览。";
  quote.textContent = text ? `“${text}”` : "“Your sentence will appear here.”";
}

function showView(target) {
  document.querySelectorAll(".view").forEach((view) => view.classList.toggle("is-visible", view.id === target));
  document.querySelectorAll(".nav-item").forEach((item) => item.classList.toggle("is-active", item.dataset.target === target));
  document.querySelector("#page-title").textContent = target === "history" ? "查看你的训练记录" : "开始一段朗读练习";
}

textInput.addEventListener("input", updateText);

clearText.addEventListener("click", () => {
  textInput.value = "";
  updateText();
  textInput.focus();
});

document.querySelectorAll("[data-target]").forEach((button) => {
  button.addEventListener("click", () => showView(button.dataset.target));
});

document.querySelectorAll(".scene-option").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".scene-option").forEach((item) => item.classList.remove("is-selected"));
    button.classList.add("is-selected");
  });
});

speakButton.addEventListener("click", () => {
  const text = textInput.value.trim();
  if (!text) {
    textInput.focus();
    return;
  }
  if (!("speechSynthesis" in window)) {
    speakButton.textContent = "浏览器不支持朗读";
    return;
  }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = accent.value;
  utterance.rate = Number(speed.value);
  speakButton.innerHTML = "<span>■</span>朗读中...";
  utterance.onend = () => { speakButton.innerHTML = "<span>▶</span>播放朗读"; };
  window.speechSynthesis.speak(utterance);
});

function formatTime(seconds) {
  return `录音中 00:${String(seconds).padStart(2, "0")}`;
}

async function toggleRecording() {
  if (recorder && recorder.state === "recording") {
    recorder.stop();
    return;
  }
  if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
    recordState.textContent = "当前浏览器不支持录音";
    return;
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    recorder = new MediaRecorder(stream);
    recorder.ondataavailable = () => {};
    recorder.onstop = () => {
      stream.getTracks().forEach((track) => track.stop());
      clearInterval(recordingTimer);
      recordButton.classList.remove("is-recording");
      recordLabel.textContent = "开始跟读";
      recordState.textContent = "录音已完成";
      feedbackPanel.classList.remove("is-hidden");
      feedbackPanel.scrollIntoView({ behavior: "smooth", block: "nearest" });
    };
    recorder.start();
    recordingSeconds = 0;
    recordButton.classList.add("is-recording");
    recordLabel.textContent = "结束录音";
    recordState.classList.add("is-recording");
    recordState.textContent = formatTime(recordingSeconds);
    recordingTimer = setInterval(() => {
      recordingSeconds += 1;
      recordState.textContent = formatTime(recordingSeconds);
    }, 1000);
  } catch {
    recordState.textContent = "未获得麦克风权限";
  }
}

recordButton.addEventListener("click", toggleRecording);

retryButton.addEventListener("click", () => {
  feedbackPanel.classList.add("is-hidden");
  recordState.classList.remove("is-recording");
  recordState.textContent = "准备开始";
  recordButton.scrollIntoView({ behavior: "smooth", block: "center" });
});

updateText();
