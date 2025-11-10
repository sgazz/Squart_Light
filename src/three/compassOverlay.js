import * as THREE from 'three';

const CANVAS_SIZE = 256;
const COMPASS_RADIUS = 100;
const POINTER_LENGTH = 70;
const POINTER_WIDTH = 8;
const TEXT_COLOR = '#ffffff';
const WRAPPER_ID = 'squart-compass-overlay';

export class CompassOverlay {
  constructor() {
    this.boardRows = 0;
    this.boardCols = 0;
    this.canvas = null;
    this.context = null;
    this.forward = new THREE.Vector3();

    this.initCanvas();
    this.drawCompass(0);
  }

  updateBoardSize(rows, cols) {
    this.boardRows = rows;
    this.boardCols = cols;
    this.drawCompass(0);
  }

  updateFromCamera(camera) {
    if (!this.context) {
      return;
    }

    this.forward.set(0, 0, -1).applyQuaternion(camera.quaternion);
    const angle = Math.atan2(this.forward.x, this.forward.z);
    this.drawCompass(angle);
  }

  drawCompass(angle) {
    if (!this.context) {
      return;
    }

    const ctx = this.context;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    ctx.translate(CANVAS_SIZE / 2, CANVAS_SIZE / 2);

    ctx.beginPath();
    ctx.arc(0, 0, COMPASS_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.save();
    ctx.rotate(angle);
    ctx.fillStyle = '#d73a49';
    ctx.beginPath();
    ctx.moveTo(0, -POINTER_LENGTH);
    ctx.lineTo(POINTER_WIDTH, -30);
    ctx.lineTo(-POINTER_WIDTH, -30);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#1f6feb';
    ctx.beginPath();
    ctx.moveTo(0, POINTER_LENGTH);
    ctx.lineTo(POINTER_WIDTH, 30);
    ctx.lineTo(-POINTER_WIDTH, 30);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-COMPASS_RADIUS, 0);
    ctx.lineTo(COMPASS_RADIUS, 0);
    ctx.moveTo(0, -COMPASS_RADIUS);
    ctx.lineTo(0, COMPASS_RADIUS);
    ctx.stroke();

    ctx.fillStyle = TEXT_COLOR;
    ctx.font = "bold 22px 'Inter', sans-serif";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('N', 0, -COMPASS_RADIUS + 20);
    ctx.fillText('S', 0, COMPASS_RADIUS - 20);
    ctx.fillText('E', COMPASS_RADIUS - 20, 0);
    ctx.fillText('W', -COMPASS_RADIUS + 20, 0);

    if (this.boardRows && this.boardCols) {
      ctx.font = "600 18px 'Inter', sans-serif";
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.fillText(`${this.boardCols} × ${this.boardRows}`, 0, COMPASS_RADIUS - 48);
    }

    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  initCanvas() {
    const existing = document.getElementById(WRAPPER_ID);
    if (existing) {
      existing.remove();
    }

    const wrapper = document.createElement('div');
    wrapper.id = WRAPPER_ID;
    wrapper.style.position = 'absolute';
    wrapper.style.bottom = '16px';
    wrapper.style.right = '16px';
    wrapper.style.width = '160px';
    wrapper.style.height = '160px';
    wrapper.style.pointerEvents = 'none';
    wrapper.style.zIndex = '1000';

    this.canvas = document.createElement('canvas');
    this.canvas.width = CANVAS_SIZE;
    this.canvas.height = CANVAS_SIZE;
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.context = this.canvas.getContext('2d');

    wrapper.appendChild(this.canvas);
    document.body.appendChild(wrapper);
  }
}
