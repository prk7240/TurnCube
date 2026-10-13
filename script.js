const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const startScreen = document.getElementById("startScreen");
const clearScreen = document.getElementById("clearScreen");
const startButton = document.getElementById("startButton");
const restartButton = document.getElementById("restartButton");
const gameUI = document.getElementById("gameUI");
const keyStatus = document.getElementById("keyStatus");
const rotationText = document.getElementById("rotationText");
const message = document.getElementById("message");

let W = innerWidth;
let H = innerHeight;

function resize() {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = innerWidth * dpr;
  canvas.height = innerHeight * dpr;
  canvas.style.width = innerWidth + "px";
  canvas.style.height = innerHeight + "px";
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  W = innerWidth;
  H = innerHeight;
}

addEventListener("resize", resize);
resize();

const keys = {};

addEventListener("keydown", e => {
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) {
    e.preventDefault();
  }

  if (!keys[e.code]) {
    if (e.code === "Space" && gameRunning) {
      rotateWorld();
    }

    if (e.code === "KeyX" && gameRunning) {
      player.jump();
    }
  }

  keys[e.code] = true;
});

addEventListener("keyup", e => {
  keys[e.code] = false;
});

// 모바일 터치/클릭 버튼 바인딩 함수
function bindTouchButton(id, keyCode, actionFn) {
  const btn = document.getElementById(id);
  if (!btn) return;

  const pressOn = (e) => {
    e.preventDefault();
    keys[keyCode] = true;
    btn.classList.add("pressed");
    if (actionFn && gameRunning) {
      actionFn();
    }
  };

  const pressOff = (e) => {
    e.preventDefault();
    keys[keyCode] = false;
    btn.classList.remove("pressed");
  };

  btn.addEventListener("pointerdown", pressOn);
  btn.addEventListener("pointerup", pressOff);
  btn.addEventListener("pointerleave", pressOff);
  btn.addEventListener("pointercancel", pressOff);
}

// 터치 컨트롤 바인딩 적용
window.addEventListener("DOMContentLoaded", () => {
  bindTouchButton("btnUp", "ArrowUp");
  bindTouchButton("btnDown", "ArrowDown");
  bindTouchButton("btnLeft", "ArrowLeft");
  bindTouchButton("btnRight", "ArrowRight");
  bindTouchButton("btnJump", "KeyX", () => player.jump());
  bindTouchButton("btnRotate", "Space", () => rotateWorld());
});

/*
  핵심 규칙

  미로는 화면에서 90도씩 회전한다.
  중력은 항상 "화면 아래쪽"으로 작용한다.

  따라서 화면을 회전하면 중력의 월드 방향도 바뀐다.

  회전 0°  : 아래로 떨어짐
  회전 90° : 왼쪽으로 떨어짐
  회전 180°: 위로 떨어짐
  회전 270°: 오른쪽으로 떨어짐

  이것을 이용해 벽/바닥에 착지하고,
  다시 SPACE로 공간을 회전시켜 다음 구간으로 이동한다.
*/

const WORLD_W = 3600;
const WORLD_H = 3000;

const walls = [
  // 외곽
  {x:0,y:0,w:WORLD_W,h:70},
  {x:0,y:WORLD_H-70,w:WORLD_W,h:70},
  {x:0,y:0,w:70,h:WORLD_H},
  {x:WORLD_W-70,y:0,w:70,h:WORLD_H},

  // 상단
  {x:180,y:250,w:1450,h:65},
  {x:470,y:315,w:65,h:330},
  {x:700,y:430,w:420,h:65},
  {x:1050,y:130,w:65,h:350},
  {x:1450,y:180,w:70,h:520},
  {x:1650,y:250,w:700,h:65},
  {x:2360,y:315,w:65,h:650},
  {x:2550,y:130,w:780,h:70},

  // 왼쪽
  {x:180,y:760,w:70,h:850},
  {x:250,y:760,w:600,h:65},
  {x:770,y:825,w:65,h:440},
  {x:250,y:1470,w:600,h:65},
  {x:400,y:1535,w:65,h:430},
  {x:100,y:1965,w:700,h:65},

  // 중앙
  {x:1020,y:700,w:70,h:560},
  {x:1090,y:700,w:500,h:65},
  {x:1520,y:765,w:70,h:380},
  {x:1180,y:1145,w:410,h:65},
  {x:1180,y:1210,w:65,h:450},
  {x:600,y:1770,w:700,h:65},
  {x:1250,y:1660,w:65,h:450},
  {x:1315,y:2020,w:500,h:65},

  // 오른쪽
  {x:1780,y:470,w:70,h:430},
  {x:1850,y:835,w:480,h:65},
  {x:2250,y:900,w:65,h:380},
  {x:1850,y:1215,w:470,h:65},
  {x:1780,y:1280,w:70,h:480},
  {x:1850,y:1695,w:650,h:65},
  {x:2435,y:1760,w:65,h:430},
  {x:2500,y:2125,w:520,h:65},

  // 하단
  {x:150,y:2300,w:650,h:65},
  {x:735,y:2365,w:65,h:360},
  {x:800,y:2660,w:500,h:65},
  {x:1300,y:2220,w:65,h:440},
  {x:1365,y:2520,w:650,h:65},
  {x:1945,y:2585,w:65,h:300},
  {x:2010,y:2370,w:550,h:65},
  {x:2495,y:2300,w:65,h:300},
  {x:2560,y:2350,w:620,h:65},

  // 작은 장애물
  {x:850,y:550,w:170,h:65},
  {x:930,y:615,w:65,h:150},
  {x:1510,y:1350,w:190,h:65},
  {x:1640,y:1415,w:65,h:160},
  {x:2750,y:600,w:300,h:65},
  {x:2870,y:665,w:65,h:300},
  {x:950,y:2150,w:220,h:65},
  {x:1100,y:2215,w:65,h:150},
  {x:2800,y:1200,w:300,h:65},
  {x:3000,y:1265,w:65,h:250}
];

const player = {
  x: 520,
  y: 2110,
  size: 42,

  // 방향키 이동
  moveSpeed: 310,

  // 중력
  gravity: 1450,
  maxFallSpeed: 900,
  vx: 0,
  vy: 0,

  // 점프
  jumpPower: 900,

  z: 0,
  vz: 0,

  key: false,

  reset() {
    this.x = 520;
    this.y = 2110;
    this.vx = 0;
    this.vy = 0;
    this.z = 0;
    this.vz = 0;
    this.key = false;
  },

  jump() {
    // 점프는 현재 중력의 반대 방향으로 작용한다.
    const g = getGravityVector();

    if (isGrounded()) {
      this.vx -= g.x * this.jumpPower;
      this.vy -= g.y * this.jumpPower;
    }
  }
};

const keyItem = {
  x: 3260,
  y: 2450,
  size: 32,
  collected: false
};

let rotation = 0;
let gameRunning = false;
let lastTime = 0;

function startGame() {
  player.reset();
  keyItem.collected = false;
  rotation = 0;

  gameRunning = true;

  startScreen.classList.add("hidden");
  clearScreen.classList.add("hidden");
  gameUI.classList.remove("hidden");

  updateHUD();

  lastTime = performance.now();
  requestAnimationFrame(loop);
}

startButton.addEventListener("click", startGame);
restartButton.addEventListener("click", startGame);

function rotateWorld() {
  rotation = (rotation + 90) % 360;

  player.vx *= 0.35;
  player.vy *= 0.35;

  updateHUD();

  const directions = {
    0: "중력 ↓",
    90: "중력 ←",
    180: "중력 ↑",
    270: "중력 →"
  };

  message.textContent = `공간 회전 ${rotation}° / ${directions[rotation]}`;
  message.classList.add("show");

  clearTimeout(message._timer);
  message._timer = setTimeout(() => {
    message.classList.remove("show");
  }, 900);
}

function getGravityVector() {
  const r = rotation * Math.PI / 180;
  return {
    x: -Math.sin(r),
    y: Math.cos(r)
  };
}

function getScreenAxes() {
  const r = rotation * Math.PI / 180;
  return {
    right: {
      x: Math.cos(r),
      y: Math.sin(r)
    },
    down: getGravityVector()
  };
}

function getMovementInput() {
  let x = 0;
  let y = 0;

  if (keys.ArrowLeft) x -= 1;
  if (keys.ArrowRight) x += 1;
  if (keys.ArrowUp) y -= 1;
  if (keys.ArrowDown) y += 1;

  return {x, y};
}

function rectsOverlap(a, b) {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

function playerRect(nx = player.x, ny = player.y) {
  return {
    x: nx - player.size / 2,
    y: ny - player.size / 2,
    w: player.size,
    h: player.size
  };
}

function collides(nx, ny) {
  const p = playerRect(nx, ny);

  for (const wall of walls) {
    if (rectsOverlap(p, wall)) {
      return true;
    }
  }

  return false;
}

function isGrounded() {
  const g = getGravityVector();
  const checkDistance = 5;

  return collides(
    player.x + g.x * checkDistance,
    player.y + g.y * checkDistance
  );
}

function moveWithCollision(dx, dy) {
  const nx = player.x + dx;

  if (!collides(nx, player.y)) {
    player.x = nx;
  } else {
    player.vx = 0;
  }

  const ny = player.y + dy;

  if (!collides(player.x, ny)) {
    player.y = ny;
  } else {
    player.vy = 0;
  }
}

function updatePhysics(dt) {
  const gravity = getGravityVector();
  const input = getMovementInput();
  const axes = getScreenAxes();

  const inputX =
    axes.right.x * input.x +
    axes.down.x * input.y;

  const inputY =
    axes.right.y * input.x +
    axes.down.y * input.y;

  const controlStrength = player.moveSpeed * dt;

  let dx = inputX * controlStrength;
  let dy = inputY * controlStrength;

  player.vx += gravity.x * player.gravity * dt;
  player.vy += gravity.y * player.gravity * dt;

  const fallSpeed = Math.hypot(player.vx, player.vy);

  if (fallSpeed > player.maxFallSpeed) {
    player.vx =
      player.vx / fallSpeed * player.maxFallSpeed;
    player.vy =
      player.vy / fallSpeed * player.maxFallSpeed;
  }

  dx += player.vx * dt;
  dy += player.vy * dt;

  moveWithCollision(dx, dy);

  if (isGrounded()) {
    const dot =
      player.vx * gravity.x +
      player.vy * gravity.y;

    if (dot > 0) {
      player.vx -= gravity.x * dot;
      player.vy -= gravity.y * dot;
    }
  }
}

function checkKey() {
  if (keyItem.collected) return;

  const distance = Math.hypot(
    player.x - keyItem.x,
    player.y - keyItem.y
  );

  if (distance < 55) {
    keyItem.collected = true;
    player.key = true;

    updateHUD();

    message.textContent = "노란 열쇠를 획득했습니다!";
    message.classList.add("show");

    setTimeout(() => {
      clearScreen.classList.remove("hidden");
      gameRunning = false;
    }, 700);
  }
}

function updateHUD() {
  rotationText.textContent = `${rotation}°`;
  keyStatus.textContent = keyItem.collected ? "획득!" : "미획득";
}

function drawWorld() {
  ctx.fillStyle = "#d4d4d0";
  ctx.fillRect(0, 0, WORLD_W, WORLD_H);

  ctx.strokeStyle = "rgba(0,0,0,.045)";
  ctx.lineWidth = 1;

  for (let x = 0; x <= WORLD_W; x += 80) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, WORLD_H);
    ctx.stroke();
  }

  for (let y = 0; y <= WORLD_H; y += 80) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(WORLD_W, y);
    ctx.stroke();
  }

  for (const wall of walls) {
    ctx.fillStyle = "#303238";
    ctx.fillRect(wall.x, wall.y, wall.w, wall.h);

    ctx.strokeStyle = "#111216";
    ctx.lineWidth = 3;
    ctx.strokeRect(wall.x, wall.y, wall.w, wall.h);
  }

  drawDirectionLabels();

  if (!keyItem.collected) {
    drawKey(keyItem.x, keyItem.y);
  }
}

function drawDirectionLabels() {
  ctx.save();

  ctx.fillStyle = "rgba(20,20,20,.45)";
  ctx.font = "bold 36px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  ctx.fillText("N", WORLD_W / 2, 120);
  ctx.fillText("S", WORLD_W / 2, WORLD_H - 120);
  ctx.fillText("W", 120, WORLD_H / 2);
  ctx.fillText("E", WORLD_W - 120, WORLD_H / 2);

  ctx.restore();
}

function drawKey(x, y) {
  ctx.save();
  ctx.translate(x, y);

  const pulse = 1 + Math.sin(performance.now() / 180) * 0.08;
  ctx.scale(pulse, pulse);

  ctx.fillStyle = "rgba(0,0,0,.25)";
  ctx.beginPath();
  ctx.ellipse(4, 10, 22, 9, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#ffd21a";
  ctx.strokeStyle = "#8b6500";
  ctx.lineWidth = 4;

  ctx.beginPath();
  ctx.arc(-7, -5, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillRect(2, -8, 26, 7);
  ctx.fillRect(18, -1, 7, 12);
  ctx.fillRect(9, -1, 7, 7);

  ctx.restore();
}

function getCamera() {
  const screenOffsetX = 0;
  const screenOffsetY = 180;

  const r = rotation * Math.PI / 180;
  const cos = Math.cos(r);
  const sin = Math.sin(r);

  const worldOffsetX =
    screenOffsetX * cos - screenOffsetY * sin;

  const worldOffsetY =
    screenOffsetX * sin + screenOffsetY * cos;

  return {
    x: player.x - worldOffsetX,
    y: player.y - worldOffsetY
  };
}

function getPlayerScreenPosition() {
  const screenOffsetX = 0;
  const screenOffsetY = 180;

  const screenX = W / 2 + screenOffsetX;
  const screenY = H * 0.62 + screenOffsetY;

  return {
    x: screenX,
    y: screenY
  };
}

function drawPlayer(camera) {
  const pos = getPlayerScreenPosition();

  ctx.save();
  ctx.translate(pos.x, pos.y);

  const s = player.size;
  const g = getGravityVector();

  ctx.fillStyle = "rgba(0,0,0,.28)";
  ctx.beginPath();

  ctx.ellipse(
    -g.x * 18,
    -g.y * 18,
    s * 0.55,
    s * 0.22,
    0,
    0,
    Math.PI * 2
  );

  ctx.fill();

  ctx.fillStyle = "#ffd21a";
  ctx.strokeStyle = "#161616";
  ctx.lineWidth = 5;

  ctx.fillRect(-s / 2, -s / 2, s, s);
  ctx.strokeRect(-s / 2, -s / 2, s, s);

  ctx.fillStyle = "rgba(255,255,255,.28)";
  ctx.fillRect(
    -s / 2 + 5,
    -s / 2 + 5,
    s * .35,
    s * .18
  );

  ctx.restore();
}

function drawGravityIndicator() {
  const g = getGravityVector();

  const x = 75;
  const y = H - 150;
  const length = 36;

  ctx.save();
  ctx.translate(x, y);

  ctx.strokeStyle = "rgba(255,255,255,.75)";
  ctx.fillStyle = "rgba(255,255,255,.75)";
  ctx.lineWidth = 4;
  ctx.lineCap = "round";

  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(g.x * length, g.y * length);
  ctx.stroke();

  const angle = Math.atan2(g.y, g.x);

  ctx.translate(g.x * length, g.y * length);
  ctx.rotate(angle);

  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(-10, -7);
  ctx.lineTo(-10, 7);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

function draw() {
  ctx.clearRect(0, 0, W, H);

  const camera = getCamera();

  ctx.save();
  ctx.translate(W / 2, H * 0.62);
  ctx.rotate(-rotation * Math.PI / 180);
  ctx.translate(-camera.x, -camera.y);

  drawWorld();

  ctx.restore();

  drawPlayer(camera);
  drawGravityIndicator();
}

function loop(now) {
  if (!gameRunning) return;

  let dt = (now - lastTime) / 1000;
  dt = Math.min(dt, 0.033);
  lastTime = now;

  updatePhysics(dt);
  checkKey();
  draw();

  requestAnimationFrame(loop);
}

startScreen.classList.remove("hidden");