import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
// Render a scanned tree from two sides onto a transparent atlas: a billboard "impostor".
(async () => { try {
  const W = 512, H = 768;
  const r = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  r.setSize(W * 2, H);
  r.setClearColor(0x000000, 0);
  r.outputColorSpace = THREE.SRGBColorSpace;
  r.toneMapping = THREE.AgXToneMapping;
  document.body.appendChild(r.domElement);
  const scene = new THREE.Scene();
  scene.environment = new THREE.PMREMGenerator(r).fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.5;
  const sun = new THREE.DirectionalLight(0xffffff, 2.2);
  sun.position.set(3, 6, 4);
  scene.add(sun, new THREE.HemisphereLight(0xdfefff, 0x55663a, 0.9));
  console.log('loading ' + (window as any).MODEL);
  const g = await new GLTFLoader().loadAsync((window as any).MODEL);
  console.log('loaded');
  scene.add(g.scene);
  const b = new THREE.Box3().setFromObject(g.scene);
  const size = b.getSize(new THREE.Vector3()), c = b.getCenter(new THREE.Vector3());
  const half = Math.max(size.x, size.z) / 2, hh = size.y / 2;
  const s = Math.max(half / (W / H), hh) * 1.02;
  const cam = new THREE.OrthographicCamera(-s * (W / H), s * (W / H), s, -s, 0.1, 1000);
  r.setScissorTest(true);
  for (let i = 0; i < 2; i++) {
    const a = i * Math.PI / 2;
    cam.position.set(c.x + Math.sin(a) * 50, c.y, c.z + Math.cos(a) * 50);
    cam.lookAt(c);
    sun.position.set(c.x + Math.sin(a + 0.6) * 5, c.y + 8, c.z + Math.cos(a + 0.6) * 5);
    r.setViewport(i * W, 0, W, H);
    r.setScissor(i * W, 0, W, H);
    r.render(scene, cam);
  }
  console.log('rendered');
  (window as any).DONE = { url: r.domElement.toDataURL('image/png'), aspect: (size.y) / (2 * s * (W / H)), height: size.y, width: 2 * s * (W / H) };
} catch (e) { console.log('ERR ' + (e as Error).message); } })();
