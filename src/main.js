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
const dirLight = new THREE.DirectionalLight(0xffffff, 1);
dirLight.position.set(5, 5, 5);
scene.add(dirLight);

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
let modelRef = null;
const loader = new GLTFLoader();
loader.load(
  "model.glb",
  (gltf) => {
    const model = gltf.scene;
    scene.add(model);
    modelRef = model;
    // Define model 3D points
    // Create anchor points as Object3D children of the model
    const point1 = new THREE.Object3D(); // Roof
    point1.position.set(2, 1.5, 0);
    model.add(point1);

    const point2 = new THREE.Object3D();
    point2.position.set(0, 0, 2.5);
    model.add(point2);

    const label1 = document.getElementById("label1");
    const label2 = document.getElementById("label2");

    const line1 = createLine();
    const line2 = createLine();

    scene.add(line1, line2);

    labelPoints.push({ position: point1, element: label1, line: line1 });
    labelPoints.push({ position: point2, element: label2, line: line2 });

    const toggleButton = document.getElementById("toggleModel");
    let modelVisible = true;

    toggleButton.addEventListener("click", () => {
      if (modelRef) {
        modelVisible = !modelVisible;
        modelRef.visible = modelVisible;
        toggleButton.textContent = modelVisible ? "Hide Model" : "Show Model";
      }
    });

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

  updateLabelLines();

  renderer.render(scene, camera);
}

function updateLabelLines() {
  const labelOffsetY = 300;

  labelPoints.forEach(({ position, element, line }) => {
    const worldPos = new THREE.Vector3();
    position.getWorldPosition(worldPos);

    // Convert world position to NDC (normalized device coordinates)
    const screenPos = worldPos.clone().project(camera);

    const x = (screenPos.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-screenPos.y * 0.5 + 0.5) * window.innerHeight;

    // Update DOM label position
    element.style.left = `${x}px`;
    element.style.top = `${y - labelOffsetY}px`;

    // Visibility check
    const visible = screenPos.z >= -1 && screenPos.z <= 1;
    element.style.display = visible ? "block" : "none";
    line.visible = visible;

    // 🔁 Label world position from screen (unproject)
    const labelNDC = new THREE.Vector3(
      (x / window.innerWidth) * 2 - 1,
      -((y - labelOffsetY) / window.innerHeight) * 2 + 1,
      0.5 // Z between near/far
    );
    labelNDC.unproject(camera);

    // Update line geometry
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

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

renderer.domElement.addEventListener("click", (event) => {
  // Convert mouse to NDC
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);

  labelPoints.forEach(({ position, element }) => {
    const worldPos = new THREE.Vector3();
    position.getWorldPosition(worldPos);

    const distance = raycaster.ray.distanceToPoint(worldPos);

    if (distance < 1) {
      // 👇 Customize these based on label IDs or use a `name` field in labelPoints
      if (element.id === "label1") {
        alert("You clicked the Roof!");
      } else if (element.id === "label2") {
        alert("You clicked the Door!");
      }
    }
  });
});
