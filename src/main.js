import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

// Preloading setup
const totalFrames = 38;
const frameImages = [];
const loadingText = document.getElementById("loading-text");
const progressBar = document.getElementById("progress-bar");

for (let i = 0; i < totalFrames; i++) {
  const number = String(i).padStart(4, "0");
  frameImages.push(`images/36_${number}_Ultra.jpeg`);
}

function preloadImages(images) {
  let loaded = 0;
  return Promise.all(
    images.map((src) => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = src;
        img.onload = () => {
          loaded++;
          const percent = Math.floor((loaded / images.length) * 100);
          loadingText.textContent = `Loading... ${percent}%`;
          progressBar.style.width = `${percent}%`;
          resolve();
        };
        img.onerror = reject;
      });
    })
  );
}

preloadImages(frameImages).then(() => {
  document.getElementById("loading-screen").style.display = "none";

  // === 3D Setup ===
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

  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x000000, 0); // Transparent background
  container.appendChild(renderer.domElement);

  const dirLight = new THREE.DirectionalLight(0xffffff, 1);
  dirLight.position.set(5, 5, 5);
  scene.add(dirLight);
  scene.add(new THREE.AmbientLight(0x666666));

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 1.5, 0);
  controls.enableDamping = true;
  controls.enableRotate = false; // prevent user free rotation
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

      const point1 = new THREE.Object3D();
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

      updateRotationSnap();
      animate();
    },
    undefined,
    (err) => {
      console.error("Failed to load model.glb:", err);
    }
  );

  function createLine() {
    const geometry = new THREE.BufferGeometry();
    const points = new Float32Array(6);
    geometry.setAttribute("position", new THREE.BufferAttribute(points, 3));
    const material = new THREE.LineBasicMaterial({ color: 0xff0000 });
    return new THREE.Line(geometry, material);
  }

  function animate() {
    requestAnimationFrame(animate);
    controls.update();
    updateLabelLines();
    // updateImageFromRotation();
    renderer.render(scene, camera);
  }

  function updateLabelLines() {
    const labelOffsetY = 300;
    labelPoints.forEach(({ position, element, line }) => {
      const worldPos = new THREE.Vector3();
      position.getWorldPosition(worldPos);
      const screenPos = worldPos.clone().project(camera);
      const x = (screenPos.x * 0.5 + 0.5) * window.innerWidth;
      const y = (-screenPos.y * 0.5 + 0.5) * window.innerHeight;

      element.style.left = `${x}px`;
      element.style.top = `${y - labelOffsetY}px`;

      const visible = screenPos.z >= -1 && screenPos.z <= 1;
      element.style.display = visible ? "block" : "none";
      line.visible = visible;

      const labelNDC = new THREE.Vector3(
        (x / window.innerWidth) * 2 - 1,
        -((y - labelOffsetY) / window.innerHeight) * 2 + 1,
        0.5
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

  const imgElement = document.getElementById("frameViewer");

  function updateRotationSnap() {
    if (modelRef) {
      modelRef.rotation.y = targetRotation;
    }

    // Image sync
    const frameIndex =
      Math.round((targetRotation / (2 * Math.PI)) * totalFrames) % totalFrames;
    imgElement.src = frameImages[frameIndex];
  }

  // function updateImageFromRotation() {
  //   const azimuthAngle = controls.getAzimuthalAngle(); // -π to π
  //   const normalizedAngle = 1 - (azimuthAngle + Math.PI) / (2 * Math.PI);
  //   const frameIndex = Math.floor(normalizedAngle * totalFrames) % totalFrames;
  //   imgElement.src = frameImages[frameIndex];
  // }

  let isDragging = false;
  let startX = 0;
  let targetRotation = 0;

  let totalSteps = 38; // Default
  let stepAngle = (2 * Math.PI) / totalSteps;

  const stepInput = document.getElementById("stepInput");
  stepInput.addEventListener("change", () => {
    const userInput = parseInt(stepInput.value, 10);
    if (!isNaN(userInput) && userInput > 0) {
      totalSteps = userInput;
    } else {
      totalSteps = 38; // fallback to default
    }
    stepAngle = (2 * Math.PI) / totalSteps;
  });

  renderer.domElement.addEventListener("mousedown", (e) => {
    isDragging = true;
    startX = e.clientX;
  });

  renderer.domElement.addEventListener("mouseup", () => {
    isDragging = false;
  });

  renderer.domElement.addEventListener("mousemove", (e) => {
    if (!isDragging) return;

    const dx = e.clientX - startX;
    if (Math.abs(dx) > 10) {
      const direction = dx > 0 ? 1 : -1; // ✅ FIXED
      targetRotation =
        (targetRotation + direction * stepAngle + 2 * Math.PI) % (2 * Math.PI);
      updateRotationSnap();
      startX = e.clientX;
    }
  });

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  renderer.domElement.addEventListener("click", (event) => {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);

    labelPoints.forEach(({ position, element }) => {
      const worldPos = new THREE.Vector3();
      position.getWorldPosition(worldPos);
      const distance = raycaster.ray.distanceToPoint(worldPos);
      if (distance < 1) {
        if (element.id === "label1") {
          alert("You clicked the Roof!");
        } else if (element.id === "label2") {
          alert("You clicked the Door!");
        }
      }
    });
  });
});
