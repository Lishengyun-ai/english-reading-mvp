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
const voice = document.querySelector("#voice");
const speed = document.querySelector("#speed");
const translateButton = document.querySelector("#translate-button");
const historyEmpty = document.querySelector("#history-empty");
const historyList = document.querySelector("#history-list");
const historyItems = document.querySelector("#history-items");
const historyCount = document.querySelector("#history-count");

let recorder;
let recordingTimer;
let recordingSeconds = 0;
const HISTORY_KEY = "speakly-english-practice-history";
let availableVoices = [];

function preferredVoice(voices, language) {
  const languageVoices = voices.filter((item) => item.lang.toLowerCase().startsWith(language.toLowerCase()));
  const preferredNames = [
    "Samantha", "Microsoft Aria", "Microsoft Jenny", "Ava",
    "Google US English", "Microsoft Zira", "Alex", "Karen",
  ];
  return [...languageVoices].sort((left, right) => {
    const leftScore = preferredNames.findIndex((name) => left.name.includes(name));
    const rightScore = preferredNames.findIndex((name) => right.name.includes(name));
    return (leftScore < 0 ? 99 : leftScore) - (rightScore < 0 ? 99 : rightScore);
  })[0] || languageVoices[0];
}

function renderVoices() {
  if (!("speechSynthesis" in window)) return;
  const selectedLanguage = accent.value;
  const languageVoices = availableVoices
    .filter((item) => item.lang.toLowerCase().startsWith(selectedLanguage.toLowerCase()))
    .sort((left, right) => left.name.localeCompare(right.name));
  const previousValue = voice.value;
  voice.innerHTML = `<option value="">自动选择温和音色</option>${languageVoices
    .map((item) => `<option value="${availableVoices.indexOf(item)}">${item.name}</option>`)
    .join("")}`;
  if (languageVoices.some((item) => String(availableVoices.indexOf(item)) === previousValue)) {
    voice.value = previousValue;
  }
}

function loadVoices() {
  if (!("speechSynthesis" in window)) return;
  availableVoices = window.speechSynthesis.getVoices();
  renderVoices();
}

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

async function translateParagraph(paragraph) {
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(paragraph)}&langpair=en|zh-CN`;
  const response = await fetch(url);
  if (!response.ok) throw new Error("翻译服务暂时不可用");
  const data = await response.json();
  const translated = data.responseData?.translatedText?.trim();
  if (!translated) throw new Error("没有获得翻译结果");
  return translated;
}

async function translateEnglish() {
  const source = textInput.value.trim();
  if (!source) {
    textInput.focus();
    return;
  }

  const originalLabel = translateButton.textContent;
  translateButton.disabled = true;
  translateButton.textContent = "翻译中...";
  try {
    const paragraphs = source.split(/\n\s*\n/);
    const translatedParagraphs = [];
    for (const paragraph of paragraphs) {
      const lines = paragraph.split("\n").map((line) => line.trim()).filter(Boolean);
      const translatedLines = [];
      for (const line of lines) {
        const chunks = line.match(/.{1,450}(?:\s+|$)/g) || [line];
        const translatedChunks = [];
        for (const chunk of chunks) translatedChunks.push(await translateParagraph(chunk.trim()));
        translatedLines.push(translatedChunks.join(""));
      }
      translatedParagraphs.push(translatedLines.join("\n"));
    }
    translationInput.value = translatedParagraphs.join("\n\n").slice(0, 2000);
    updateTranslation();
  } catch (error) {
    translationPreview.textContent = error.message || "翻译失败，请稍后重试或手动输入中文。";
  } finally {
    translateButton.disabled = false;
    translateButton.textContent = originalLabel;
  }
}

function getHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
  } catch {
    return [];
  }
}

function savePractice() {
  const scene = document.querySelector(".scene-option.is-selected")?.dataset.scene || "面试";
  const history = getHistory();
  history.unshift({
    id: Date.now(),
    createdAt: new Date().toISOString(),
    scene,
    english: textInput.value.trim(),
    translation: translationInput.value.trim(),
    scores: { overall: 82, pronunciation: 86, rhythm: 78, fluency: 82 },
  });
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 50)));
  renderHistory();
}

function formatDate(isoDate) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit",
  }).format(new Date(isoDate));
}

function renderHistory() {
  const history = getHistory();
  const hasHistory = history.length > 0;
  historyEmpty.classList.toggle("is-hidden", hasHistory);
  historyList.classList.toggle("is-hidden", !hasHistory);
  historyCount.textContent = `${history.length} 次练习`;
  historyItems.innerHTML = history.map((item) => `
    <article class="history-item">
      <div class="history-item-main">
        <div class="history-item-meta"><span class="history-scene">${item.scene}</span><time>${formatDate(item.createdAt)}</time></div>
        <p class="history-english">${item.english || "未填写英文内容"}</p>
        ${item.translation ? `<p class="history-translation">${item.translation}</p>` : ""}
      </div>
      <div class="history-score"><strong>${item.scores.overall}</strong><span>综合分</span></div>
    </article>
  `).join("");
}

function showView(target) {
  document.querySelectorAll(".view").forEach((view) => view.classList.toggle("is-visible", view.id === target));
  document.querySelectorAll(".nav-item").forEach((item) => item.classList.toggle("is-active", item.dataset.target === target));
  document.querySelector("#page-title").textContent = target === "history" ? "查看你的训练记录" : "开始一段朗读练习";
  if (target === "history") renderHistory();
}

textInput.addEventListener("input", updateText);
translationInput.addEventListener("input", updateTranslation);
translateButton.addEventListener("click", translateEnglish);

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
  utterance.pitch = accent.value === "en-US" ? 1.08 : 1.02;
  const selectedVoice = voice.value === ""
    ? preferredVoice(availableVoices, accent.value)
    : availableVoices[Number(voice.value)];
  if (selectedVoice) {
    utterance.voice = selectedVoice;
    utterance.lang = selectedVoice.lang;
  }
  speakButton.innerHTML = "<span>■</span>朗读中...";
  utterance.onend = () => { speakButton.innerHTML = "<span>▶</span>播放朗读"; };
  window.speechSynthesis.speak(utterance);
});

accent.addEventListener("change", renderVoices);
if ("speechSynthesis" in window) {
  window.speechSynthesis.addEventListener("voiceschanged", loadVoices);
  loadVoices();
}

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
      savePractice();
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
renderHistory();
