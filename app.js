// =========================================================
// ① LINE 内ブラウザ → 警告表示のみ（リダイレクトしない）
// =========================================================
(function () {
  const ua = navigator.userAgent.toLowerCase();
  const isLine = ua.includes("line");
  const already = location.search.includes("from=line");

  if (isLine && !already) {
    alert("LINE のブラウザでは保存ができません。\n右上「・・・」→『外部ブラウザで開く』を押してください。");
  }
})();

/* ===============================================
   DOM取得
================================================ */
const photoInput = document.getElementById("photoInput");
const photo = document.getElementById("photo");
const viewport = document.getElementById("photoViewport");

const brightness = document.getElementById("brightness");
const contrast = document.getElementById("contrast");
const saturation = document.getElementById("saturation");

const nameInput = document.getElementById("nameInput");
const nickInput = document.getElementById("nickInput");
const idInput = document.getElementById("idInput");
const memoInput = document.getElementById("memoInput");

const nameOut = document.getElementById("nameOut");
const nickOut = document.getElementById("nickOut");
const idOut = document.getElementById("idOut");
const memoOut = document.getElementById("memoOut");

const saveBtn = document.getElementById("saveBtn");
const card = document.getElementById("card");

const accBtn = document.getElementById("photoAccBtn");
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
   写真フィット
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
   移動制限（背景が見えない）
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
   1本指ドラッグ + 2本指ピンチ＋2本指移動
========================================================= */

let pinchStartDistance = 0;
let startScale = 1;
let pinchStartCenter = { x: 0, y: 0 };
let pinchStartOffset = { x: 0, y: 0 };

function getPoint(e) {
  if (e.touches && e.touches[0]) {
    return { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }
  return { x: e.clientX, y: e.clientY };
}

function getDistance(t) {
  const dx = t[0].clientX - t[1].clientX;
  const dy = t[0].clientY - t[1].clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

function getCenter(t) {
  return {
    x: (t[0].clientX + t[1].clientX) / 2,
    y: (t[0].clientY + t[1].clientY) / 2
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

viewport.addEventListener("mouseup", () => isDragging = false);
viewport.addEventListener("mouseleave", () => isDragging = false);
viewport.addEventListener("touchend", () => isDragging = false);

/* --- 2本指ピンチ + 移動 --- */
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

    currentScale = Math.max(baseScale, startScale * ratio);

    const newCenter = getCenter(e.touches);
    offsetX = pinchStartOffset.x + (newCenter.x - pinchStartCenter.x);
    offsetY = pinchStartOffset.y + (newCenter.y - pinchStartCenter.y);

    applyPhotoTransform();
  }
}, { passive: false });

/* ===============================================
   ホイール拡大
================================================ */
viewport.addEventListener("wheel", (e) => {
  if (!photo.src) return;

  e.preventDefault();
  const delta = e.deltaY > 0 ? 0.9 : 1.1;
  currentScale = Math.max(baseScale, currentScale * delta);

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
   テキスト入力バインド
================================================ */
const guideName = document.querySelector(".guide-name");
const guideNick = document.querySelector(".guide-nick");
const guideId = document.querySelector(".guide-id");
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
   ID → A + 数字
================================================ */
function updateId() {
  let raw = idInput.value.replace(/\D/g, ""); // 数字のみ抽出
  idInput.value = raw; // 入力欄は数字のみにする

  // カードに表示する ID
  if (raw) {
    idOut.textContent = "A" + raw;
    guideId.style.display = "none";
  } else {
    idOut.textContent = "";  // A を表示しない（未入力時は空欄）
    guideId.style.display = "block";
  }
}

idInput.addEventListener("input", updateId);
updateId();


/* ===============================================
   PNG保存（iPhone対応）
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

    const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/png"));

    const safeName = nameOut.textContent.replace(/[\\/:*?"<>|]/g, '') || "card";
    const rawId = idInput.value.replace(/\D/g, '');
    const fileName = rawId ? `${safeName}_A${rawId}.png` : `${safeName}.png`;

    // iPhone Safari
    if (navigator.canShare && navigator.canShare({ files: [new File([blob], fileName)] })) {
      const file = new File([blob], fileName, { type: "image/png" });
      await navigator.share({ files: [file], title: fileName });
    } else {
      const link = document.createElement("a");
      link.download = fileName;
      link.href = URL.createObjectURL(blob);
      link.click();
      URL.revokeObjectURL(link.href);
    }

  } catch (err) {
    console.error(err);
    alert("保存に失敗しました");
  } finally {
    card.classList.remove("exporting");
  }
});
