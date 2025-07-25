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
camera.lookAt(0, 15, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0xffffff); // ← sets background to white
container.appendChild(renderer.domElement);

const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(5, 5, 5);
scene.add(light);
scene.add(new THREE.AmbientLight(0x666666));

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 1.5, 0); // 🧭 looking at center of model
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.enablePan = false;
controls.enableZoom = false;
const fixedPolarAngle = Math.PI / 4; // ~45° elevation
controls.minPolarAngle = fixedPolarAngle;
controls.maxPolarAngle = fixedPolarAngle;
controls.target.set(0, 0.5, 0); // Optional: target where camera looks
controls.update();

// Lock camera elevation angle after initial view (around 45°)
controls.addEventListener("change", () => {
  controls.getPolarAngle = () => Math.PI / 4;
  controls.minPolarAngle = Math.PI / 4;
  controls.maxPolarAngle = Math.PI / 4;
});

// Lock rotation to horizontal axis only
controls.minPolarAngle = Math.PI / 4; // Prevent looking up/down
controls.maxPolarAngle = Math.PI / 2;

const labelPoints = []; // 👈 Declare globally

const loader = new GLTFLoader();
loader.load(
  "/model.glb",
  (gltf) => {
    const model = gltf.scene;
    scene.add(model);

    // Set points in model space — adjust as needed
    const point1 = new THREE.Vector3(0, 2.5, 0); // roof
    const point2 = new THREE.Vector3(1, 0, 0); // door

    const label1 = document.getElementById("label1");
    const label2 = document.getElementById("label2");

    labelPoints.push({ position: point1, element: label1 });
    labelPoints.push({ position: point2, element: label2 });

    animate();
  },
  undefined,
  (err) => {
    console.error("Failed to load model.glb:", err);
  }
);

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);

  labelPoints.forEach(({ position, element }) => {
    const pos = position.clone();
    pos.project(camera);

    const x = (pos.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-pos.y * 0.5 + 0.5) * window.innerHeight;

    element.style.left = `${x}px`;
    element.style.top = `${y}px`;

    // Optionally hide if behind camera
    const visible = pos.z >= -1 && pos.z <= 1;
    element.style.display = visible ? "block" : "none";
  });
}

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
