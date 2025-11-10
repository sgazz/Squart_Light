import * as THREE from 'three';

const CANVAS_WIDTH = 1024;
const CANVAS_HEIGHT = 256;
const DEFAULT_TEXT_COLOR = '#ffffff';
const BACKGROUND_COLOR = 'rgba(0, 0, 0, 0.6)';
const STROKE_COLOR = 'rgba(0, 0, 0, 0.3)';
const FONT = "bold 96px 'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif";
const BANNER_PADDING_X = 48;
const BANNER_PADDING_Y = 32;
const CORNER_RADIUS = 32;
const STROKE_WIDTH = 6;

function createCanvasContext() {
  const canvas = document.createElement('canvas');
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;
  const context = canvas.getContext('2d');
  return { canvas, context };
}

function drawBanner(context, text, color) {
  context.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  const bannerWidth = CANVAS_WIDTH - BANNER_PADDING_X * 2;
  const bannerHeight = CANVAS_HEIGHT - BANNER_PADDING_Y * 2;

  context.fillStyle = BACKGROUND_COLOR;
  context.beginPath();
  roundRect(context, BANNER_PADDING_X, BANNER_PADDING_Y, bannerWidth, bannerHeight, CORNER_RADIUS);
  context.fill();

  context.strokeStyle = STROKE_COLOR;
  context.lineWidth = STROKE_WIDTH;
  context.stroke();

  context.fillStyle = color || DEFAULT_TEXT_COLOR;
  context.font = FONT;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.shadowColor = 'rgba(0, 0, 0, 0.45)';
  context.shadowBlur = 10;
  context.fillText(text, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
}

export function createWinnerBanner({ text, color, width }) {
  const { canvas, context } = createCanvasContext();
  drawBanner(context, text, color);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.anisotropy = 8;

  const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
  const sprite = new THREE.Sprite(material);
  sprite.userData = { canvas, context, texture };

  applyScale(sprite, width);
  return sprite;
}

export function updateWinnerBanner(sprite, { text, color, width }) {
  if (!sprite || !sprite.userData) {
    return;
  }

  const { context, texture } = sprite.userData;
  drawBanner(context, text, color);
  texture.needsUpdate = true;
  applyScale(sprite, width);
}

export function disposeWinnerBanner(sprite) {
  if (!sprite || !sprite.material) {
    return;
  }

  const { texture } = sprite.userData ?? {};
  if (texture) {
    texture.dispose();
  }

  sprite.material.dispose();
}

function applyScale(sprite, width = 1) {
  const aspectRatio = CANVAS_WIDTH / CANVAS_HEIGHT;
  const bannerWidth = Math.max(2.5, width);
  const bannerHeight = bannerWidth / aspectRatio;
  sprite.scale.set(bannerWidth, bannerHeight, 1);
}

function roundRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
