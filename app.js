const textInput = document.querySelector("#text-input");
const translationInput = document.querySelector("#translation-input");
const charCount = document.querySelector("#char-count");
const sentencePreview = document.querySelector("#sentence-preview");
const translationPreview = document.querySelector("#translation-preview");
const quote = document.querySelector("#quote");
const clearText = document.querySelector("#clear-text");
const clearTranslation = document.querySelector("#clear-translation");
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

function htmlToPlainText(html) {
  const container = document.createElement("div");
  container.innerHTML = html;

  const blockTags = new Set(["ADDRESS", "ARTICLE", "ASIDE", "BLOCKQUOTE", "DIV", "DL", "DT", "DD", "FIGCAPTION", "FIGURE", "FOOTER", "H1", "H2", "H3", "H4", "H5", "H6", "HEADER", "LI", "MAIN", "NAV", "OL", "P", "PRE", "SECTION", "TABLE", "TR", "UL"]);
  const output = [];

  function walk(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      output.push(node.nodeValue);
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;

    if (node.tagName === "BR") {
      output.push("\n");
      return;
    }
    node.childNodes.forEach(walk);
    if (blockTags.has(node.tagName)) output.push("\n");
  }

  container.childNodes.forEach(walk);
  return output.join("")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function updateText() {
  const text = textInput.value.trim();
  charCount.textContent = `${textInput.value.length} / 2000`;
  sentencePreview.textContent = text || "输入一句英文后，这里会显示分句预览。";
  quote.textContent = text ? `“${text}”` : "“Your sentence will appear here.”";
}

function updateTranslation() {
  const translation = translationInput.value.trim();
  translationPreview.textContent = translation || "输入中文翻译后，这里会显示翻译预览。";
}

function showView(target) {
  document.querySelectorAll(".view").forEach((view) => view.classList.toggle("is-visible", view.id === target));
  document.querySelectorAll(".nav-item").forEach((item) => item.classList.toggle("is-active", item.dataset.target === target));
  document.querySelector("#page-title").textContent = target === "history" ? "查看你的训练记录" : "开始一段朗读练习";
}

textInput.addEventListener("input", updateText);
translationInput.addEventListener("input", updateTranslation);

function preserveRichTextPaste(event, input, onUpdate) {
  const html = event.clipboardData?.getData("text/html");
  const plainText = event.clipboardData?.getData("text/plain") || "";
  const pastedText = html ? htmlToPlainText(html) : plainText;
  if (!pastedText) return;

  event.preventDefault();
  const start = input.selectionStart ?? input.value.length;
  const end = input.selectionEnd ?? start;
  input.value = `${input.value.slice(0, start)}${pastedText}${input.value.slice(end)}`.slice(0, 2000);
  input.selectionStart = input.selectionEnd = Math.min(start + pastedText.length, 2000);
  onUpdate();
}

textInput.addEventListener("paste", (event) => preserveRichTextPaste(event, textInput, updateText));
translationInput.addEventListener("paste", (event) => preserveRichTextPaste(event, translationInput, updateTranslation));

clearText.addEventListener("click", () => {
  textInput.value = "";
  updateText();
  textInput.focus();
});

clearTranslation.addEventListener("click", () => {
  translationInput.value = "";
  updateTranslation();
  translationInput.focus();
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
updateTranslation();
