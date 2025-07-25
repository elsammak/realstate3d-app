import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

const container = document.getElementById("app");
const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(0, 5, 6);
camera.lookAt(0, 1.5, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0xffffff);
container.appendChild(renderer.domElement);

// Lighting
scene.add(new THREE.DirectionalLight(0xffffff, 1).position.set(5, 5, 5));
scene.add(new THREE.AmbientLight(0x666666));

// Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 1.5, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.enablePan = false;
controls.enableZoom = false;
const fixedPolarAngle = Math.PI / 4;
controls.minPolarAngle = fixedPolarAngle;
controls.maxPolarAngle = fixedPolarAngle;
controls.update();

const labelPoints = [];

const loader = new GLTFLoader();
loader.load(
  "/model.glb",
  (gltf) => {
    const model = gltf.scene;
    scene.add(model);

    // Define model 3D points
    const point1 = new THREE.Vector3(0, 2.5, 0); // 🏠 Roof
    const point2 = new THREE.Vector3(1, 0, 0); // 🚪 Door

    const label1 = document.getElementById("label1");
    const label2 = document.getElementById("label2");

    const line1 = createLine();
    const line2 = createLine();

    scene.add(line1, line2);

    labelPoints.push({ position: point1, element: label1, line: line1 });
    labelPoints.push({ position: point2, element: label2, line: line2 });

    animate();
  },
  undefined,
  (err) => {
    console.error("Failed to load model.glb:", err);
  }
);

// Creates a red line with two dummy points
function createLine() {
  const geometry = new THREE.BufferGeometry();
  const points = new Float32Array(6); // start (x,y,z), end (x,y,z)
  geometry.setAttribute("position", new THREE.BufferAttribute(points, 3));
  const material = new THREE.LineBasicMaterial({ color: 0xff0000 });
  return new THREE.Line(geometry, material);
}

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);

  const labelOffsetY = 300; // px above model point

  labelPoints.forEach(({ position, element, line }) => {
    const worldPos = position.clone();
    const screenPos = worldPos.clone().project(camera);

    const x = (screenPos.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-screenPos.y * 0.5 + 0.5) * window.innerHeight;

    // Position label (with vertical offset)
    element.style.left = `${x}px`;
    element.style.top = `${y - labelOffsetY}px`;

    // Hide if behind camera
    const visible = screenPos.z >= -1 && screenPos.z <= 1;
    element.style.display = visible ? "block" : "none";
    line.visible = visible;

    // Line endpoint = label screen position unprojected into world
    const labelNDC = new THREE.Vector3(
      (x / window.innerWidth) * 2 - 1,
      -((y - labelOffsetY) / window.innerHeight) * 2 + 1,
      0.5 // Midway between near/far planes
    );
    labelNDC.unproject(camera);

    const posArray = line.geometry.attributes.position.array;
    posArray[0] = worldPos.x;
    posArray[1] = worldPos.y;
    posArray[2] = worldPos.z;
    posArray[3] = labelNDC.x;
    posArray[4] = labelNDC.y;
    posArray[5] = labelNDC.z;
    line.geometry.attributes.position.needsUpdate = true;
  });
}

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
