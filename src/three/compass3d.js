import * as THREE from 'three';

const BASE_RADIUS = 0.48;
const POINTER_LENGTH = 0.45;
const POINTER_HEAD = 0.12;
const POINTER_TAIL = 0.04;
const LABEL_COLOR = '#f5f6fa';
const BACKDROP_COLOR = 0x0d1224;
const RING_COLOR = 0x4f6599;
const ACCENT_COLOR_POSITIVE = 0x6ea8ff;
const ACCENT_COLOR_NEGATIVE = 0xff8064;

export class Compass3D {
  constructor(scene) {
    this.scene = scene;
    this.offset = new THREE.Vector3(-1.2, -1, -2.4);
    this.target = new THREE.Vector3();
    this.forward = new THREE.Vector3();

    this.boardRows = 0;
    this.boardCols = 0;

    this.root = new THREE.Group();
    this.root.name = 'compass-3d';
    this.root.renderOrder = 999;
    this.root.frustumCulled = false;
    this.root.scale.setScalar(0.9);

    // Dial that rotates to keep N aligned with world north.
    this.dial = new THREE.Group();

    this.buildDial();
    this.root.add(this.dial);
    scene.add(this.root);
  }

  dispose() {
    this.scene.remove(this.root);
  }

  updateBoardSize(rows, cols) {
    this.boardRows = rows;
    this.boardCols = cols;
    if (this.sizeLabel) {
      const text = rows && cols ? `${cols} × ${rows}` : '';
      this.updateLabelSprite(this.sizeLabel, text, LABEL_COLOR, 0.65);
    }
  }

  update(camera) {
    if (!camera) {
      return;
    }

    // Position the compass relative to camera (lower-left of view).
    this.target.copy(this.offset);
    camera.localToWorld(this.target);
    this.root.position.lerp(this.target, 0.15);

    // Match camera orientation so dial faces viewer.
    this.root.quaternion.slerp(camera.quaternion, 0.2);

    // Dial rotates so that N arrow points towards world +Z (north).
    this.forward.set(0, 0, -1).applyQuaternion(camera.quaternion);
    const angle = Math.atan2(this.forward.x, this.forward.z);
    this.dial.rotation.set(0, -angle, 0);
  }

  buildDial() {
    this.dial.add(this.createBackdrop());
    this.dial.add(this.createRing());

    this.dial.add(this.createAxisLine(new THREE.Vector3(1, 0, 0)));
    this.dial.add(this.createAxisLine(new THREE.Vector3(0, 0, 1)));

    this.dial.add(this.createArrow(new THREE.Vector3(0, 0, 1), ACCENT_COLOR_NEGATIVE));
    this.dial.add(this.createArrow(new THREE.Vector3(0, 0, -1), ACCENT_COLOR_POSITIVE));

    this.dial.add(this.createLetterSprite('N', new THREE.Vector3(0, 0.03, BASE_RADIUS + 0.16), ACCENT_COLOR_NEGATIVE));
    this.dial.add(this.createLetterSprite('S', new THREE.Vector3(0, 0.03, -BASE_RADIUS - 0.16), ACCENT_COLOR_POSITIVE));
    this.dial.add(this.createLetterSprite('E', new THREE.Vector3(BASE_RADIUS + 0.16, 0.03, 0), LABEL_COLOR));
    this.dial.add(this.createLetterSprite('W', new THREE.Vector3(-BASE_RADIUS - 0.16, 0.03, 0), LABEL_COLOR));

    this.sizeLabel = this.createLabelSprite('', LABEL_COLOR, 0.6);
    this.sizeLabel.position.set(0, 0.24, 0);
    this.dial.add(this.sizeLabel);
  }

  createBackdrop() {
    const geometry = new THREE.CylinderGeometry(BASE_RADIUS, BASE_RADIUS, 0.02, 48, 1, true);
    const material = new THREE.MeshStandardMaterial({
      color: BACKDROP_COLOR,
      roughness: 0.8,
      metalness: 0.1,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = Math.PI / 2;
    mesh.position.y = -0.015;

    const glassGeometry = new THREE.CircleGeometry(BASE_RADIUS * 0.78, 42);
    const glassMaterial = new THREE.MeshBasicMaterial({
      color: BACKDROP_COLOR,
      transparent: true,
      opacity: 0.35,
    });
    const glass = new THREE.Mesh(glassGeometry, glassMaterial);
    glass.rotation.x = -Math.PI / 2;
    mesh.add(glass);

    return mesh;
  }

  createRing() {
    const geometry = new THREE.TorusGeometry(BASE_RADIUS * 0.92, 0.008, 16, 96);
    const material = new THREE.MeshBasicMaterial({
      color: RING_COLOR,
      transparent: true,
      opacity: 0.55,
    });
    const torus = new THREE.Mesh(geometry, material);
    torus.rotation.x = Math.PI / 2;
    return torus;
  }

  createAxisLine(direction) {
    const length = BASE_RADIUS * 1.9;
    const geometry = new THREE.CylinderGeometry(0.008, 0.008, length, 8);
    const material = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.25 });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.z = direction.z !== 0 ? 0 : Math.PI / 2;
    if (direction.z === 0) {
      mesh.rotation.y = Math.PI / 2;
    }
    mesh.position.y = 0.02;
    return mesh;
  }

  createArrow(direction, color) {
    const arrow = new THREE.ArrowHelper(
      direction.clone().normalize(),
      new THREE.Vector3(0, 0.05, 0),
      POINTER_LENGTH,
      color,
      POINTER_HEAD,
      POINTER_TAIL
    );
    arrow.cone.material.transparent = true;
    arrow.cone.material.opacity = 0.85;
    arrow.line.material.transparent = true;
    arrow.line.material.opacity = 0.35;
    return arrow;
  }

  createLetterSprite(letter, position, color) {
    const sprite = this.createLabelSprite(letter, color, 0.42);
    sprite.position.copy(position);
    return sprite;
  }

  createLabelSprite(text, color = LABEL_COLOR, scale = 0.5) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;

    const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false, depthWrite: false });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(scale, scale, 1);
    sprite.renderOrder = 1000;
    sprite.userData = { canvas, ctx, texture, color };

    this.updateLabelSprite(sprite, text, color, scale);
    return sprite;
  }

  updateLabelSprite(sprite, text, color = LABEL_COLOR, scale = 0.5) {
    if (!sprite || !sprite.userData) {
      return;
    }

    const { canvas, ctx, texture } = sprite.userData;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = color;
    ctx.font = "600 140px 'Inter', sans-serif";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);

    texture.needsUpdate = true;
    sprite.scale.set(scale, scale, 1);
  }
}
