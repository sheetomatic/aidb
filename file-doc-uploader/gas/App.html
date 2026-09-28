(function () {
  const MAX_PAGES = window.FileDocScan.MAX_PAGES;
  const prefill = String(
    (typeof window.FILEDOC_PREFILL === "string" ? window.FILEDOC_PREFILL : "") ||
    new URLSearchParams(location.search).get("fileNumber") ||
    new URLSearchParams(location.search).get("file") ||
    ""
  ).trim();

  const state = {
    fileNumber: "",
    locked: false,
    fromAppSheet: false,
    stream: null,
    pendingDataUrl: null,
    pages: [],
    busy: false,
    gasMode: typeof google !== "undefined" && google.script && google.script.run
  };

  const els = {
    fileNumber: document.getElementById("fileNumber"),
    lockFileBtn: document.getElementById("lockFileBtn"),
    openCameraBtn: document.getElementById("openCameraBtn"),
    captureBtn: document.getElementById("captureBtn"),
    pickBtn: document.getElementById("pickBtn"),
    filePick: document.getElementById("filePick"),
    saveToFormBtn: document.getElementById("saveToFormBtn"),
    retakeBtn: document.getElementById("retakeBtn"),
    saveAllBtn: document.getElementById("saveAllBtn"),
    clearBtn: document.getElementById("clearBtn"),
    video: document.getElementById("video"),
    shotPreview: document.getElementById("shotPreview"),
    cameraStage: document.getElementById("cameraStage"),
    cameraHint: document.getElementById("cameraHint"),
    guide: document.getElementById("guide"),
    countLabel: document.getElementById("countLabel"),
    folderLabel: document.getElementById("folderLabel"),
    progressBar: document.getElementById("progressBar"),
    emptyState: document.getElementById("emptyState"),
    docList: document.getElementById("docList"),
    sessionMeta: document.getElementById("sessionMeta"),
    toast: document.getElementById("toast"),
    modeBadge: document.getElementById("modeBadge"),
    modeNote: document.getElementById("modeNote")
  };

  if (state.gasMode && prefill) {
    els.modeBadge.textContent = "AppSheet";
    els.modeNote.textContent = "Opened from AppSheet. Scan up to 60 pages. Done saves one PDF in the Drive folder for this file number. Use Launch external so the phone browser can open the camera.";
  } else if (state.gasMode) {
    els.modeBadge.textContent = "Google Drive";
    els.modeNote.textContent = "Connected to Apps Script. Done saves one PDF into the Drive folder for this file number.";
  } else if (prefill) {
    els.modeBadge.textContent = "AppSheet link";
    els.modeNote.textContent = "File number came from the link, the same way AppSheet opens this form. Demo mode downloads the PDF on this device.";
  } else {
    els.modeBadge.textContent = "Local demo";
    els.modeNote.textContent = "Demo mode downloads the PDF on this device. Deploy gas/ and open that web app from AppSheet with an External website action to save into Drive.";
  }

  function toast(message, type) {
    els.toast.textContent = message;
    els.toast.className = "toast show" + (type ? " " + type : "");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => els.toast.classList.remove("show"), 2800);
  }

  function folderName(fileNumber) {
    return "File-" + String(fileNumber).trim().replace(/[\\/:*?"<>|]/g, "-");
  }

  function updateUI() {
    const count = state.pages.length;
    els.countLabel.textContent = count + " / " + MAX_PAGES;
    els.progressBar.style.width = ((count / MAX_PAGES) * 100) + "%";
    els.folderLabel.textContent = state.locked ? ("Folder: " + folderName(state.fileNumber)) : "Folder: —";
    els.sessionMeta.textContent = state.locked ? ("File " + state.fileNumber) : "Not started";
    const atMax = count >= MAX_PAGES;
    els.openCameraBtn.disabled = !state.locked || atMax || state.busy;
    els.pickBtn.disabled = !state.locked || atMax || state.busy;
    els.captureBtn.disabled = !state.stream || !!state.pendingDataUrl || atMax || state.busy;
    els.saveToFormBtn.disabled = !state.pendingDataUrl || atMax || state.busy;
    els.saveAllBtn.disabled = !state.locked || count === 0 || state.busy;
    els.clearBtn.disabled = count === 0 || state.busy;
    els.lockFileBtn.hidden = state.fromAppSheet;
    els.lockFileBtn.textContent = state.locked ? "Change" : "Start";
    els.fileNumber.disabled = state.fromAppSheet || (state.locked && count > 0);

    if (count === 0) {
      els.emptyState.hidden = false;
      els.docList.hidden = true;
      els.docList.innerHTML = "";
    } else {
      els.emptyState.hidden = true;
      els.docList.hidden = false;
      els.docList.innerHTML = state.pages.map((page, idx) => `
        <li class="doc-item">
          <img src="${page.dataUrl}" alt="${page.name}" />
          <div>
            <h3>${page.name}</h3>
            <p>Page ${idx + 1} of ${count} · scan</p>
          </div>
          <button type="button" class="btn-danger" data-remove="${idx}" aria-label="Remove ${page.name}">✕</button>
        </li>
      `).join("");
    }
  }

  async function stopCamera() {
    if (state.stream) {
      state.stream.getTracks().forEach((track) => track.stop());
      state.stream = null;
    }
    els.video.srcObject = null;
    els.guide.hidden = true;
  }

  async function openCamera() {
    if (!state.locked) return;
    if (state.pages.length >= MAX_PAGES) {
      toast("Limit reached: 60 pages per PDF.", "err");
      return;
    }
    try {
      await stopCamera();
      clearPending();
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1600 },
          height: { ideal: 1200 }
        }
      });
      state.stream = stream;
      els.video.srcObject = stream;
      await els.video.play();
      els.guide.hidden = false;
      els.cameraHint.textContent = "Align the page inside the frame, then press Click / Capture.";
      updateUI();
      toast("Camera ready", "ok");
    } catch (err) {
      console.error(err);
      els.cameraHint.textContent = "Camera blocked. Allow camera permission, or choose a photo instead.";
      toast("Could not open camera. Use Choose photo.", "err");
    }
  }

  function clearPending() {
    state.pendingDataUrl = null;
    els.cameraStage.classList.remove("is-preview");
    els.shotPreview.removeAttribute("src");
    els.retakeBtn.hidden = true;
  }

  function showPending(dataUrl) {
    state.pendingDataUrl = dataUrl;
    els.shotPreview.src = dataUrl;
    els.cameraStage.classList.add("is-preview");
    els.cameraHint.textContent = "Scan look applied. Add this page, or retake.";
    els.retakeBtn.hidden = false;
    updateUI();
  }

  function captureShot() {
    if (!state.stream) return;
    try {
      showPending(window.FileDocScan.imageToScanJpeg(els.video));
    } catch (err) {
      console.error(err);
      toast("Could not scan that frame. Try again.", "err");
    }
  }

  function pickPhoto() {
    if (!state.locked || state.pages.length >= MAX_PAGES) return;
    els.filePick.value = "";
    els.filePick.click();
  }

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Could not read that image."));
      img.src = src;
    });
  }

  function onPickedFile(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const img = await loadImage(String(reader.result));
        showPending(window.FileDocScan.imageToScanJpeg(img));
      } catch (err) {
        console.error(err);
        toast("Could not scan that photo.", "err");
      }
    };
    reader.readAsDataURL(file);
  }

  function retake() {
    clearPending();
    els.cameraHint.textContent = state.stream
      ? "Align the page inside the frame, then press Click / Capture."
      : "Choose another photo, or open the camera.";
    updateUI();
  }

  function addPage() {
    if (!state.pendingDataUrl) return;
    if (state.pages.length >= MAX_PAGES) {
      toast("Already at 60 pages.", "err");
      return;
    }
    const n = String(state.pages.length + 1).padStart(3, "0");
    state.pages.push({
      name: "page-" + n + ".jpg",
      dataUrl: state.pendingDataUrl,
      capturedAt: new Date().toISOString()
    });
    clearPending();
    els.cameraHint.textContent = state.stream
      ? "Page added. Capture the next page, or press Done when the scan is finished."
      : "Page added. Add the next page, or press Done when the scan is finished.";
    updateUI();
    toast("Page " + state.pages.length + " of " + MAX_PAGES + " added", "ok");
  }

  function lockOrChangeFile() {
    if (state.fromAppSheet) return;
    if (state.locked && state.pages.length > 0) {
      toast("Clear pages before changing the file number.", "err");
      return;
    }
    if (state.locked) {
      state.locked = false;
      state.fileNumber = "";
      stopCamera();
      clearPending();
      els.cameraHint.textContent = "Enter a file number, then scan pages one by one.";
      updateUI();
      return;
    }
    const value = els.fileNumber.value.trim();
    if (!value) {
      toast("Enter a file number first.", "err");
      els.fileNumber.focus();
      return;
    }
    state.fileNumber = value;
    state.locked = true;
    els.cameraHint.textContent = "File locked. Open the camera or choose a photo, one page at a time.";
    updateUI();
    toast("Scan started for " + value, "ok");
  }

  function clearForm() {
    if (!state.pages.length) return;
    if (!confirm("Remove all pages from this scan?")) return;
    state.pages = [];
    clearPending();
    updateUI();
    toast("Pages cleared", "ok");
  }

  function renumber() {
    state.pages.forEach((page, i) => {
      page.name = "page-" + String(i + 1).padStart(3, "0") + ".jpg";
    });
  }

  function downloadPdf(bytes, name) {
    const blob = new Blob([bytes], { type: "application/pdf" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function uploadPdf(bytes) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(reader.error || new Error("Could not read the PDF."));
      reader.onload = () => {
        const dataUrl = String(reader.result || "");
        const pdfBase64 = dataUrl.split(",")[1] || "";
        google.script.run
          .withSuccessHandler(resolve)
          .withFailureHandler((err) => reject(err))
          .uploadPdf({
            fileNumber: state.fileNumber,
            folderName: folderName(state.fileNumber),
            pageCount: state.pages.length,
            pdfBase64: pdfBase64
          });
      };
      reader.readAsDataURL(new Blob([bytes], { type: "application/pdf" }));
    });
  }

  async function saveAll() {
    if (!state.pages.length || state.busy) return;
    state.busy = true;
    els.saveAllBtn.textContent = "Making PDF…";
    updateUI();
    try {
      const jpegs = state.pages.map((page) => window.FileDocScan.dataUrlToBytes(page.dataUrl));
      const bytes = window.FileDocScan.buildScanPdf(jpegs);
      const name = folderName(state.fileNumber) + ".pdf";
      try {
        localStorage.setItem("filedoc-last-pdf", JSON.stringify({
          fileNumber: state.fileNumber,
          folderName: folderName(state.fileNumber),
          pageCount: state.pages.length,
          bytes: bytes.length,
          savedAt: new Date().toISOString()
        }));
      } catch (err) {
        console.error(err);
      }
      if (state.gasMode) {
        const result = await uploadPdf(bytes);
        toast("Saved " + result.pageCount + " pages to Drive /" + result.folderName + "/" + result.fileName, "ok");
      } else {
        downloadPdf(bytes, name);
        toast("PDF downloaded (" + state.pages.length + " pages). Deploy gas/ for Drive.", "ok");
      }
    } catch (err) {
      console.error(err);
      toast(String(err && err.message ? err.message : err), "err");
    } finally {
      state.busy = false;
      els.saveAllBtn.textContent = "Done — make PDF";
      updateUI();
    }
  }

  function applyPrefill() {
    if (!prefill) return;
    state.fileNumber = prefill;
    state.locked = true;
    state.fromAppSheet = true;
    els.fileNumber.value = prefill;
    els.cameraHint.textContent = "File number from AppSheet. Open the camera or choose a photo, one page at a time.";
  }

  els.lockFileBtn.addEventListener("click", lockOrChangeFile);
  els.openCameraBtn.addEventListener("click", openCamera);
  els.captureBtn.addEventListener("click", captureShot);
  els.pickBtn.addEventListener("click", pickPhoto);
  els.filePick.addEventListener("change", onPickedFile);
  els.saveToFormBtn.addEventListener("click", addPage);
  els.retakeBtn.addEventListener("click", retake);
  els.saveAllBtn.addEventListener("click", saveAll);
  els.clearBtn.addEventListener("click", clearForm);
  els.docList.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-remove]");
    if (!btn) return;
    state.pages.splice(Number(btn.getAttribute("data-remove")), 1);
    renumber();
    updateUI();
    toast("Page removed", "ok");
  });
  els.fileNumber.addEventListener("keydown", (event) => {
    if (event.key === "Enter") lockOrChangeFile();
  });

  applyPrefill();
  updateUI();
})();
