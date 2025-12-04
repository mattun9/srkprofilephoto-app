// =========================================================
// ① LINE 内ブラウザ → 自動で外部ブラウザに切り替える（無限ループ防止版）
// =========================================================
(function() {
  const ua = navigator.userAgent.toLowerCase();
  const isLine = ua.includes("line");

  const alreadyRedirected = location.search.includes("from=line");

  if (isLine && !alreadyRedirected) {
    const url = "https://mattun9.github.io/srkprofilephoto-app/";
    window.location.href = url + "?from=line";
  }
})();

/* ===============================================
   DOM取得
================================================ */
const photoInput   = document.getElementById("photoInput");
const photo        = document.getElementById("photo");
const viewport     = document.getElementById("photoViewport");

const brightness   = document.getElementById("brightness");
const contrast     = document.getElementById("contrast");
const saturation   = document.getElementById("saturation");

const nameInput    = document.getElementById("nameInput");
const nickInput    = document.getElementById("nickInput");
const idInput      = document.getElementById("idInput");
const memoInput    = document.getElementById("memoInput");

const nameOut      = document.getElementById("nameOut");
const nickOut      = document.getElementById("nickOut");
const idOut        = document.getElementById("idOut");
const memoOut      = document.getElementById("memoOut");

const saveBtn      = document.getElementById("saveBtn");
const card         = document.getElementById("card");

const accBtn  = document.getElementById("photoAccBtn");
const accBody = document.getElementById("photoAccBody");

/* ===============================================
   アコーディオン
================================================ */
accBtn.addEventListener("click", () => {
  accBtn.classList.toggle("open");
  accBody.classList.toggle("open");
});

/* ===============================================
   写真ロード
================================================ */
let isDragging = false;
let startX = 0;
let startY = 0;
let offsetX = 0;
let offsetY = 0;
let currentScale = 1;
let baseScale = 1;

photoInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;

  document.getElementById("fileNameText").textContent = file.name;

  const reader = new FileReader();
  reader.onload = (ev) => {
    photo.src = ev.target.result;
  };
  reader.readAsDataURL(file);
});

photo.addEventListener("load", () => {
  fitPhotoToViewport();
  applyFilter();
});

/* ===============================================
   写真をフレームにフィット
================================================ */
function fitPhotoToViewport() {
  const vpW = viewport.clientWidth;
  const vpH = viewport.clientHeight;
  const imgW = photo.naturalWidth;
  const imgH = photo.naturalHeight;
  if (!imgW || !imgH) return;

  const scale = Math.max(vpW / imgW, vpH / imgH);

  baseScale = scale;
  currentScale = scale;
  offsetX = 0;
  offsetY = 0;

  applyPhotoTransform();
}

/* ===============================================
   移動制限（背景を絶対見せない）
================================================ */
function clampOffset() {
  const vpW = viewport.clientWidth;
  const vpH = viewport.clientHeight;
  const imgW = photo.naturalWidth * currentScale;
  const imgH = photo.naturalHeight * currentScale;

  const limitX = Math.max(0, (imgW - vpW) / 2);
  const limitY = Math.max(0, (imgH - vpH) / 2);

  offsetX = Math.min(limitX, Math.max(-limitX, offsetX));
  offsetY = Math.min(limitY, Math.max(-limitY, offsetY));
}

function applyPhotoTransform() {
  clampOffset();
  photo.style.transform =
    `translate(-50%, -50%) translate(${offsetX}px, ${offsetY}px) scale(${currentScale})`;
}

/* =========================================================
   ★★★ 最新：1本指ドラッグ + 2本指ピンチ＋2本指移動 完全版 ★★★
========================================================= */

// --- 共通変数 ---
let pinchStartDistance = 0;
let startScale = 1;
let pinchStartCenter = { x: 0, y: 0 };
let pinchStartOffset = { x: 0, y: 0 };

// --- 位置取得 ---
function getPoint(e) {
  if (e.touches && e.touches[0]) {
    return { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }
  return { x: e.clientX, y: e.clientY };
}

// --- 2点距離 ---
function getDistance(t) {
  const dx = t[0].clientX - t[1].clientX;
  const dy = t[0].clientY - t[1].clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

// --- 2点の中心 ---
function getCenter(t) {
  return {
    x: (t[0].clientX + t[1].clientX) / 2,
    y: (t[0].clientX + t[1].clientX) / 2
  };
}

/* --- 1本指ドラッグ --- */
viewport.addEventListener("mousedown", startDrag);
viewport.addEventListener("touchstart", (e) => {
  if (e.touches.length === 1) startDrag(e);
}, { passive: false });

function startDrag(e) {
  if (e.touches && e.touches.length > 1) return;

  e.preventDefault();
  if (!photo.src) return;

  isDragging = true;
  const p = getPoint(e);
  startX = p.x - offsetX;
  startY = p.y - offsetY;
}

viewport.addEventListener("mousemove", dragMove);
viewport.addEventListener("touchmove", (e) => {
  if (e.touches.length === 1) dragMove(e);
}, { passive: false });

function dragMove(e) {
  if (!isDragging) return;

  if (e.touches && e.touches.length > 1) {
    isDragging = false;
    return;
  }

  e.preventDefault();
  const p = getPoint(e);
  offsetX = p.x - startX;
  offsetY = p.y - startY;

  applyPhotoTransform();
}

viewport.addEventListener("mouseup", () => (isDragging = false));
viewport.addEventListener("mouseleave", () => (isDragging = false));
viewport.addEventListener("touchend", () => (isDragging = false));

/* --- 2本指ピンチ & パン --- */
viewport.addEventListener("touchstart", (e) => {
  if (e.touches.length === 2) {
    e.preventDefault();
    pinchStartDistance = getDistance(e.touches);
    startScale = currentScale;

    pinchStartCenter = getCenter(e.touches);
    pinchStartOffset = { x: offsetX, y: offsetY };
  }
}, { passive: false });

viewport.addEventListener("touchmove", (e) => {
  if (e.touches.length === 2) {
    e.preventDefault();

    const newDist = getDistance(e.touches);
    const ratio = newDist / pinchStartDistance;

    currentScale = startScale * ratio;
    if (currentScale < baseScale) currentScale = baseScale;

    const newCenter = getCenter(e.touches);
    offsetX = pinchStartOffset.x + (newCenter.x - pinchStartCenter.x);
    offsetY = pinchStartOffset.y + (newCenter.y - pinchStartCenter.y);

    applyPhotoTransform();
  }
}, { passive: false });

/* ===============================================
   PCホイール拡大
================================================ */
viewport.addEventListener("wheel", (e) => {
  if (!photo.src) return;

  e.preventDefault();
  const delta = e.deltaY > 0 ? 0.9 : 1.1;
  currentScale *= delta;

  if (currentScale < baseScale) currentScale = baseScale;

  applyPhotoTransform();
}, { passive: false });

/* ===============================================
   フィルター
================================================ */
function applyFilter() {
  photo.style.filter =
    `brightness(${brightness.value}%) contrast(${contrast.value}%) saturate(${saturation.value}%)`;
}
[brightness, contrast, saturation].forEach((sl) => {
  sl.addEventListener("input", applyFilter);
});

/* ===============================================
   テキスト入力
================================================ */
const guideName = document.querySelector(".guide-name");
const guideNick = document.querySelector(".guide-nick");
const guideId   = document.querySelector(".guide-id");
const guideMemo = document.querySelector(".guide-memo");

function bindText(input, output, guide) {
  const update = () => {
    const val = input.value.trim();
    output.textContent = val;
    guide.style.display = val ? "none" : "block";
  };
  input.addEventListener("input", update);
  update();
}
bindText(nameInput, nameOut, guideName);
bindText(nickInput, nickOut, guideNick);
bindText(memoInput, memoOut, guideMemo);

/* ===============================================
   ID → 常に A + 数字
================================================ */
function updateId() {
  let raw = idInput.value.replace(/\D/g, "");
  idInput.value = raw;
  idOut.textContent = raw ? "A" + raw : "";
  guideId.style.display = raw ? "none" : "block";
}
idInput.addEventListener("input", updateId);
updateId();

/* ===============================================
   PNG保存
================================================ */
saveBtn.addEventListener("click", async () => {
  if (!window.html2canvas) {
    alert("html2canvas が読み込まれていません");
    return;
  }

  card.classList.add("exporting");

  try {
    const canvas = await html2canvas(card, {
      backgroundColor: null,
      scale: 2,
      useCORS: true
    });

    const safeName = nameOut.textContent.replace(/[\\/:*?"<>|]/g, '');
    const rawId = idInput.value.replace(/\D/g, '');
    const fileName = rawId
      ? `${safeName}_A${rawId}.png`
      : `${safeName}.png`;

    const link = document.createElement("a");
    link.download = fileName;
    link.href = canvas.toDataURL("image/png");
    link.click();

  } finally {
    card.classList.remove("exporting");
    setTimeout(() => location.reload(), 800);
  }
});
