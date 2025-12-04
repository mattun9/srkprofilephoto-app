// ===============================
// LINE内ブラウザを自動で外部ブラウザに切り替え
// ===============================
(function() {
  const ua = navigator.userAgent.toLowerCase();

  // LINEアプリ内ブラウザかどうか判定
  const isLine = ua.indexOf("line") !== -1;

  if (isLine) {
    // 外部ブラウザで再度開くためのURL（あなたのGitHub Pages URL）
    const url = "https://mattun9.github.io/srkprofilephoto-app/";

    // 外部ブラウザへ遷移させる
    window.location.href = url;
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

// アコーディオン
const accBtn  = document.getElementById("photoAccBtn");
const accBody = document.getElementById("photoAccBody");
const arrow   = accBtn.querySelector(".arrow");

/* ===============================================
   アコーディオン開閉（改善版）
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

/* 画像読み込み完了後にフィット */
photo.addEventListener("load", () => {
  fitPhotoToViewport();
  applyFilter(); // 初期フィルタ
});

/* ===============================================
   ▼ 写真をフレームにフィット & 最小ズーム設定
================================================ */
function fitPhotoToViewport() {
  const vpW = viewport.clientWidth;
  const vpH = viewport.clientHeight;
  const imgW = photo.naturalWidth;
  const imgH = photo.naturalHeight;
  if (!imgW || !imgH) return;

  // フレームを完全に覆う最小スケール
  const scale = Math.max(vpW / imgW, vpH / imgH);

  baseScale = scale;
  currentScale = scale;
  offsetX = 0;
  offsetY = 0;

  applyPhotoTransform();
}

/* ===============================================
   ▼ 背景を見せないための移動制限
================================================ */
function clampOffset() {
  const vpW = viewport.clientWidth;
  const vpH = viewport.clientHeight;
  const imgW = photo.naturalWidth * currentScale;
  const imgH = photo.naturalHeight * currentScale;

  // 画像が小さくなるケースはない（baseScaleで止めている）
  const limitX = Math.max(0, (imgW - vpW) / 2);
  const limitY = Math.max(0, (imgH - vpH) / 2);

  offsetX = Math.min(limitX, Math.max(-limitX, offsetX));
  offsetY = Math.min(limitY, Math.max(-limitY, offsetY));
}

/* ===============================================
   ▼ 写真の transform 適用（常に clamp 呼ぶ）
================================================ */
function applyPhotoTransform() {
  clampOffset();  // ★背景を絶対見せない

  photo.style.transform =
    `translate(-50%, -50%) translate(${offsetX}px, ${offsetY}px) scale(${currentScale})`;
}

/* ===============================================
   ドラッグで移動（PC & スマホ）
================================================ */
function getPoint(e) {
  if (e.touches && e.touches[0]) {
    return { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }
  return { x: e.clientX, y: e.clientY };
}

viewport.addEventListener("mousedown", startDrag);
viewport.addEventListener("touchstart", startDrag, { passive: false });

function startDrag(e) {
  e.preventDefault();
  if (!photo.src) return;

  isDragging = true;
  const p = getPoint(e);
  startX = p.x - offsetX;
  startY = p.y - offsetY;
}

viewport.addEventListener("mousemove", dragMove);
viewport.addEventListener("touchmove", dragMove, { passive: false });

function dragMove(e) {
  if (!isDragging) return;
  e.preventDefault();

  const p = getPoint(e);
  offsetX = p.x - startX;
  offsetY = p.y - startY;

  applyPhotoTransform();
}

viewport.addEventListener("mouseup", endDrag);
viewport.addEventListener("mouseleave", endDrag);
viewport.addEventListener("touchend", endDrag);

function endDrag() {
  isDragging = false;
}

/* ===============================================
   ▼ ホイール拡大縮小（PC）
================================================ */
viewport.addEventListener("wheel", (e) => {
  if (!photo.src) return;

  e.preventDefault();
  const delta = e.deltaY > 0 ? 0.9 : 1.1;

  currentScale *= delta;

  // 最小スケール以下は不可
  if (currentScale < baseScale) currentScale = baseScale;

  applyPhotoTransform();
}, { passive: false });

/* ===============================================
   ▼ スマホのピンチイン／ピンチアウト対応
================================================ */
let pinchStartDistance = 0;
let startScale = 1;

// 2点間距離を計算
function getDistance(touches) {
  const dx = touches[0].clientX - touches[1].clientX;
  const dy = touches[0].clientY - touches[1].clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

// ピンチ開始
viewport.addEventListener("touchstart", (e) => {
  if (e.touches.length === 2) {
    e.preventDefault();

    pinchStartDistance = getDistance(e.touches);
    startScale = currentScale;   // 現在のズーム値を覚えておく
  }
}, { passive: false });

// ピンチ中
viewport.addEventListener("touchmove", (e) => {
  if (e.touches.length === 2) {
    e.preventDefault();

    const newDistance = getDistance(e.touches);
    const pinchRatio = newDistance / pinchStartDistance;

    // 新しいscaleを計算
    currentScale = startScale * pinchRatio;

    // 最小ズームを下回らせない
    if (currentScale < baseScale) currentScale = baseScale;

    applyPhotoTransform();  // 画像反映（背景見えない制御つき）
  }
}, { passive: false });


/* ===============================================
   フィルター（明るさ/コントラスト/彩度）
================================================ */
function applyFilter() {
  if (!photo) return;
  photo.style.filter =
    `brightness(${brightness.value}%) contrast(${contrast.value}%) saturate(${saturation.value}%)`;
}

[brightness, contrast, saturation].forEach((sl) => {
  sl.addEventListener("input", applyFilter);
});

/* ===============================================
   テキスト入力 → カード反映 & ガイド制御
================================================ */
const guideName = document.querySelector(".guide-name");
const guideNick = document.querySelector(".guide-nick");
const guideId   = document.querySelector(".guide-id");
const guideMemo = document.querySelector(".guide-memo");

function bindText(input, output, guide) {
  const update = () => {
    const val = input.value.trim();
    output.textContent = val;
    if (guide) {
      guide.style.display = val ? "none" : "block";
    }
  };
  input.addEventListener("input", update);
  update();
}

bindText(nameInput, nameOut, guideName);
bindText(nickInput, nickOut, guideNick);
bindText(idInput,   idOut,   guideId);
bindText(memoInput, memoOut, guideMemo);

/* ===============================================
   PNG保存（カードだけを高解像度で）
================================================ */
saveBtn.addEventListener("click", async () => {
  if (!window.html2canvas) {
    alert("html2canvasが読み込まれていません。ネットワークを確認してください。");
    return;
  }

  card.classList.add("exporting");

  try {
    const canvas = await html2canvas(card, {
      backgroundColor: null,
      scale: 2,
      useCORS: true
    });

    // ▼ ファイル名：名前 + ID
    const safeName = nameOut.textContent.replace(/[\\/:*?"<>|]/g, '');
    const safeId   = idOut.textContent.replace(/[\\/:*?"<>|]/g, '');
    const fileName = `${safeName}_${safeId}.png`;

    const link = document.createElement("a");
    link.download = fileName;
    link.href = canvas.toDataURL("image/png");

    // ▼ ダウンロード実行
    link.click();

  } catch (err) {
    console.error(err);
    alert("画像の保存中にエラーが発生しました。");
  } finally {
    card.classList.remove("exporting");

    // ▼ 保存を確実に完了させてからリロード（0.8秒ディレイ）
    setTimeout(() => {
      location.reload();
    }, 800);
  }
});

