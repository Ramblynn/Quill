const newFicBtn = document.getElementById("new-fic");
const ficList = document.getElementById("fic-list");
const ficTitle = document.getElementById("fic-title");
const ficEditor = document.getElementById("fic-editor");
const settingsBtn = document.getElementById("settings-btn");
const exportBtn = document.getElementById("export-btn");
const settingsPanel = document.getElementById("settings-panel");
const darkToggle = document.getElementById("dark-mode-toggle");
const syncToggle = document.getElementById("sync-time-toggle");
const preview = document.getElementById("markdown-preview");
const chapterSelector = document.getElementById("chapter-selector");
const addChapterBtn = document.getElementById("add-chapter");
const renameChapterBtn = document.getElementById("rename-chapter");
const deleteChapterBtn = document.getElementById("delete-chapter");
const wordCount = document.getElementById("word-count");
const charCount = document.getElementById("char-count");
const editTimer = document.getElementById("edit-timer");

const userSettings = JSON.parse(localStorage.getItem("quillSettings")) || {
    darkMode: false,
    syncWithTime: false,
};

let fics = JSON.parse(localStorage.getItem("quillFics")) || [];
let currentFicIndex = null;
let currentChapterIndex = 0;
let editStartTime = null;
let editTimerInterval = null;
let previewTimeout = null;
let lastActivityTime = Date.now();

function updateStats() {
    const text = ficEditor.value;
    const words = text.trim().split(/\s+/).filter(w => w.length > 0);
    wordCount.textContent = `${words.length} word${words.length !== 1 ? 's' : ''}`;
    charCount.textContent = `${text.length} char${text.length !== 1 ? 's' : ''}`;
}

function startEditTimer() {
    editStartTime = Date.now();
    clearInterval(editTimerInterval);
    editTimerInterval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - editStartTime) / 1000);
        const minutes = Math.floor(elapsed / 60);
        const seconds = elapsed % 60;
        editTimer.textContent = `${minutes}:${seconds.toString().padStart(2, "0")} elapsed`;
    }, 1000);
}

function updatePreview() {
    preview.innerHTML = marked.parse(ficEditor.value || "");
}

function applyTheme() {
    const hour = new Date().getHours();
    const autoDark = userSettings.syncWithTime && (hour < 7 || hour > 19);
    document.body.classList.toggle("dark", userSettings.darkMode || autoDark);
}

function saveSettings() {
    localStorage.setItem("quillSettings", JSON.stringify(userSettings));
    applyTheme();
}

function saveFics() {
    localStorage.setItem("quillFics", JSON.stringify(fics));
}

function renderFicList() {
    ficList.innerHTML = "";
    fics.forEach((fic, index) => {
        const li = document.createElement("li");
        li.textContent = fic.title || "Untitled";
        li.onclick = () => loadFic(index);

        const deleteBtn = document.createElement("button");
        deleteBtn.textContent = "🗑️";
        deleteBtn.className = "delete-btn";
        deleteBtn.onclick = (e) => {
            e.stopPropagation();
            deleteFic(index);
        };

        li.appendChild(deleteBtn);
        ficList.appendChild(li);
    });
}

function renderChapterSelector() {
    chapterSelector.innerHTML = "";
    if (currentFicIndex === null) return;

    const chapters = fics[currentFicIndex].chapters || [];
    chapters.forEach((ch, i) => {
        const opt = document.createElement("option");
        opt.value = i;
        opt.textContent = ch.title || `Chapter ${i + 1}`;
        chapterSelector.appendChild(opt);
    });

    chapterSelector.value = currentChapterIndex;
}

function loadCurrentChapter() {
    const chapter = fics[currentFicIndex]?.chapters?.[currentChapterIndex];
    if (!chapter) return;
    ficEditor.value = chapter.content || "";
    updatePreview();
    updateStats();
    startEditTimer();
}

function loadFic(index) {
    currentFicIndex = index;
    currentChapterIndex = 0;

    const fic = fics[index];
    ficTitle.value = fic.title;
    renderChapterSelector();
    loadCurrentChapter();
}

function createNewFic() {
    const newFic = {
        title: "Untitled",
        chapters: [{ title: "Chapter 1", content: "" }]
    };
    fics.push(newFic);
    currentFicIndex = fics.length - 1;
    currentChapterIndex = 0;
    saveFics();
    renderFicList();
    loadFic(currentFicIndex);
}

function deleteFic(index) {
    const confirmed = confirm(`Are you sure you want to delete "${fics[index].title}"?`);
    if (!confirmed) return;

    fics.splice(index, 1);
    saveFics();
    currentFicIndex = null;
    ficTitle.value = "";
    ficEditor.value = "";
    preview.innerHTML = "";
    chapterSelector.innerHTML = "";
    renderFicList();
}

ficTitle.addEventListener("input", () => {
    if (currentFicIndex !== null) {
        fics[currentFicIndex].title = ficTitle.value;
        saveFics();
        renderFicList();
    }
});

ficEditor.addEventListener("input", () => {
    if (currentFicIndex !== null) {
        fics[currentFicIndex].chapters[currentChapterIndex].content = ficEditor.value;
        saveFics();
        updateStats();

        lastActivityTime = Date.now();
        preview.style.display = "none";

        if (previewTimeout) clearTimeout(previewTimeout);
        previewTimeout = setTimeout(() => {
            const now = Date.now();
            if (now - lastActivityTime >= 20000) {
                updatePreview();
                preview.style.display = "block";
            }
        }, 20000);
    }
});

chapterSelector.addEventListener("change", () => {
    currentChapterIndex = parseInt(chapterSelector.value);
    loadCurrentChapter();
});

addChapterBtn.onclick = () => {
    if (currentFicIndex === null) return;
    const title = prompt("Enter chapter title:");
    if (!title) return;

    fics[currentFicIndex].chapters.push({ title, content: "" });
    currentChapterIndex = fics[currentFicIndex].chapters.length - 1;
    saveFics();
    renderChapterSelector();
    loadCurrentChapter();
};

newFicBtn.onclick = createNewFic;

settingsBtn.onclick = () => {
    settingsPanel.style.display = settingsPanel.style.display === "flex" ? "none" : "flex";
};

exportBtn.onclick = () => {
    if (currentFicIndex === null) return;

    const fic = fics[currentFicIndex];
    const chapter = fic.chapters[currentChapterIndex];
    const safeFicTitle = fic.title.trim().replace(/[\\/:*?"<>|]/g, "_") || "untitled";
    const safeChapterTitle = chapter.title.trim().replace(/[\\/:*?"<>|]/g, "_") || `chapter_${currentChapterIndex + 1}`;

    const content = `# ${chapter.title || `Chapter ${currentChapterIndex + 1}`}\n\n${chapter.content || ""}`;

    const blob = new Blob([content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `${safeFicTitle} - ${safeChapterTitle}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

renameChapterBtn.onclick = () => {
    if (currentFicIndex === null) return;
    const chapter = fics[currentFicIndex].chapters[currentChapterIndex];
    const newTitle = prompt("Rename chapter:", chapter.title);
    if (!newTitle) return;
    chapter.title = newTitle;
    saveFics();
    renderChapterSelector();
};

deleteChapterBtn.onclick = () => {
    if (currentFicIndex === null) return;

    const fic = fics[currentFicIndex];
    if (fic.chapters.length <= 1) {
        alert("You must have at least one chapter.");
        return;
    }

    const confirmed = confirm(`Delete chapter "${fic.chapters[currentChapterIndex].title}"?`);
    if (!confirmed) return;

    fic.chapters.splice(currentChapterIndex, 1);
    currentChapterIndex = Math.max(0, currentChapterIndex - 1);
    saveFics();
    renderChapterSelector();
    loadCurrentChapter();
};

darkToggle.onchange = (e) => {
    userSettings.darkMode = e.target.checked;
    saveSettings();
};

syncToggle.onchange = (e) => {
    userSettings.syncWithTime = e.target.checked;
    saveSettings();
};

darkToggle.checked = userSettings.darkMode;
syncToggle.checked = userSettings.syncWithTime;

applyTheme();
renderFicList();
if (fics.length > 0) loadFic(0);
