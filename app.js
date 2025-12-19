// =========================================================
// ① LINE 内ブラウザ → 警告表示のみ（リダイレクトしない）
// =========================================================
(function () {
  const ua = navigator.userAgent.toLowerCase();
  const isLine = ua.includes("line");
  const already = location.search.includes("from=line");

  if (isLine && !already) {
    alert(
      "LINE のブラウザでは保存ができません。\n右下「・・・」→『デフォルトのブラウザで開く』を押してください。"
    );
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
viewport.addEventListener("touchcancel", () => isDragging = false);

/* --- 2本指ピンチ + 2本指移動 --- */
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
   フィルター（プレビュー）
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
  let raw = idInput.value.replace(/\D/g, "");
  idInput.value = raw;

  if (raw) {
    idOut.textContent = "A" + raw;
    guideId.style.display = "none";
  } else {
    idOut.textContent = "";
    guideId.style.display = "block";
  }
}
idInput.addEventListener("input", updateId);
updateId();

/* ===============================================
   保存用：フィルターを画像に焼き付け（確実に反映）
================================================ */
async function bakeFilteredPhotoDataURL() {
  if (!photo.src || !photo.naturalWidth || !photo.naturalHeight) return null;

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  canvas.width = photo.naturalWidth;
  canvas.height = photo.naturalHeight;

  ctx.filter =
    `brightness(${brightness.value}%) contrast(${contrast.value}%) saturate(${saturation.value}%)`;

  ctx.drawImage(photo, 0, 0);

  // JPEGでOK（html2canvas側がJPEG出力なので）
  return canvas.toDataURL("image/jpeg", 1.0);
}

/* ===============================================
   小物：描画反映待ち（exporting適用・DOM反映用）
================================================ */
function nextFrame() {
  return new Promise((r) => requestAnimationFrame(() => r()));
}

function waitImageLoad(imgEl) {
  return new Promise((resolve) => {
    if (imgEl.complete && imgEl.naturalWidth) return resolve();
    imgEl.addEventListener("load", () => resolve(), { once: true });
    imgEl.addEventListener("error", () => resolve(), { once: true });
  });
}

/* ===============================================
   JPEG保存（カード全体・ガイド非表示・調整反映）
================================================ */
saveBtn.addEventListener("click", async () => {
  if (!window.html2canvas) {
    alert("html2canvas が読み込まれていません");
    return;
  }
  if (!photo.src) {
    alert("写真を選択してください");
    return;
  }

    // ▼ アニメーション開始
  saveBtn.classList.add("loading");

  // ① export用の見た目にする（ガイド・点線を消す）
  card.classList.add("exporting");

  // ★ 反映待ち（これを入れないとガイドが写る）
  await nextFrame();
  await nextFrame();

  // ② フィルターを確実に出力へ反映するため、保存時だけ焼き付け画像に差し替える
  const originalSrc = photo.src;
  const baked = await bakeFilteredPhotoDataURL();

  if (baked) {
    photo.src = baked;
    await waitImageLoad(photo); // ★差し替え反映待ち
    await nextFrame();
  }

  try {
    const canvas = await html2canvas(card, {
      backgroundColor: "#ffffff", // JPEGは白背景
      scale: 2,
      useCORS: true
    });

    canvas.toBlob(
      (blob) => {
        const safeName =
          nameOut.textContent.replace(/[\\/:*?"<>|]/g, "") || "card";
        const rawId = idInput.value.replace(/\D/g, "");
        const fileName = rawId
          ? `${safeName}_A${rawId}.jpg`
          : `${safeName}.jpg`;

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = fileName;

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      },
      "image/jpeg",
      0.92
    );
  } catch (err) {
    console.error(err);
    alert("保存に失敗しました");
  } finally {
    // ③ 元に戻す
    photo.src = originalSrc;
    // 元画像への戻しは非同期なので、ここでは待たなくてOK（表示はすぐ戻る）
    card.classList.remove("exporting");
    
    // ▼ アニメーション終了
    saveBtn.classList.remove("loading");
  }
});

/* ===============================================
   リセット
================================================ */
const resetBtn = document.getElementById("resetBtn");
if (resetBtn) {
  resetBtn.addEventListener("click", () => location.reload());
}
