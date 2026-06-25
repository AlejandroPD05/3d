import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { OrbitControls } from 'https://unpkg.com/three@0.160.0/examples/jsm/controls/OrbitControls.js';

// ============================================================================
// CONFIGURACIÓN GLOBAL Y ESCENA
// ============================================================================
const container = document.getElementById('canvas-container');
const scene = new THREE.Scene();

// Añadir niebla romántica para unificar el fondo 3D con las partículas
scene.fog = new THREE.FogExp2(0x05020c, 0.12);

const camera = new PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
// Posición inicial cinemática lejana para la animación de aproximación
camera.position.set(0, 2, 12);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
container.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.maxPolarAngle = Math.PI / 2 + 0.3; // Evita ver completamente por debajo del suelo
controls.minDistance = 2;
controls.maxDistance = 15;

// ============================================================================
// ILUMINACIÓN PROFESIONAL (ESTUDIO DE ALTA GAMA)
// ============================================================================
const ambientLight = new THREE.AmbientLight(0x1a0f2e, 1.5);
scene.add(ambientLight);

// Luz Principal (Key Light) - Cálida y superior
const keyLight = new THREE.DirectionalLight(0xffe5ec, 2.5);
keyLight.position.set(5, 8, 5);
keyLight.castShadow = true;
keyLight.shadow.mapSize.width = 2048;
keyLight.shadow.mapSize.height = 2048;
keyLight.shadow.camera.near = 0.5;
keyLight.shadow.camera.far = 20;
keyLight.shadow.bias = -0.001;
scene.add(keyLight);

// Luz de Relleno (Fill Light) - Romántica Violeta/Azulada lateral
const fillLight = new THREE.DirectionalLight(0x3a1c66, 2.0);
fillLight.position.set(-6, 3, 2);
scene.add(fillLight);

// Luz Trasera (Rim Light) - Contraluz de alta intensidad para destacar siluetas
const rimLight = new THREE.DirectionalLight(0xff3366, 4.0);
rimLight.position.set(0, 4, -8);
scene.add(rimLight);

// Luz de Acercamiento Suave enfocada en el centro del bouquet
const bouquetSpot = new THREE.SpotLight(0xff99b4, 5, 10, Math.PI / 4, 0.5, 1);
bouquetSpot.position.set(0, 5, 2);
scene.add(bouquetSpot);

// ============================================================================
// MODELADO PROCEDURAL AVANZADO: PÉTALOS Y ROSAS
// ============================================================================

/**
 * Genera una geometría matemática para un pétalo individual de rosa.
 * Manipula un plano a nivel de vértices creando flexiones hiperbólicas orgánicas.
 */
function createPetalGeometry(layerType) {
    const segmentsX = 24;
    const segmentsY = 24;
    const geometry = new THREE.PlaneGeometry(1, 1, segmentsX, segmentsY);
    
    let width, height, cupDepth, edgeCurl, flare;

    // Configuración morfológica según la madurez y posición del pétalo
    if (layerType === 'inner') {
        width = 0.35; height = 0.55; cupDepth = 0.35; edgeCurl = 0.02; flare = -0.1;
    } else if (layerType === 'middle') {
        width = 0.65; height = 0.75; cupDepth = 0.45; edgeCurl = 0.15; flare = 0.2;
    } else { // Outer
        width = 0.95; height = 0.85; cupDepth = 0.30; edgeCurl = 0.35; flare = 0.5;
    }

    const posAttr = geometry.attributes.position;
    
    for (let i = 0; i < posAttr.count; i++) {
        // Mapeo normalizado [-0.5, 0.5] para X y [0, 1] para Y
        let x = posAttr.getX(i);
        let y = posAttr.getY(i) + 0.5; 

        const u = x + 0.5;
        const v = y;

        // Ecuación del contorno de la hoja (convergencia en la base)
        const taper = Math.sin(v * Math.PI) * (1.0 + flare * v);
        x *= width * taper;
        y *= height;

        // Deformación parabólica para formar la cavidad del pétalo
        const zCup = Math.sin(v * Math.PI) * cupDepth;
        // Ondulación lateral externa (bordes de la rosa real replegados hacia atrás)
        const zLip = Math.pow(Math.abs(u - 0.5) * 2, 2.5) * edgeCurl * Math.pow(v, 2);
        
        const z = zCup - zLip;

        posAttr.setXYZ(i, x, y, z);
    }
    
    geometry.computeVertexNormals();
    return geometry;
}

// Caché de geometrías de pétalos para optimización de memoria
const petalGeometries = {
    inner: createPetalGeometry('inner'),
    middle: createPetalGeometry('middle'),
    outer: createPetalGeometry('outer')
};

/**
 * Ensambla una única rosa completa distribuyendo entre 50 y 60 pétalos en espiral áurea.
 */
function buildProceduralRose(baseColorHex) {
    const roseGroup = new THREE.Group();
    const totalPetals = 55;

    for (let i = 0; i < totalPetals; i++) {
        let type = 'inner';
        if (i >= 12 && i < 32) type = 'middle';
        else if (i >= 32) type = 'outer';

        // Variaciones sutiles por material físico para simular rugosidades y microterciopelo
        const petalMat = new THREE.MeshPhysicalMaterial({
            color: new THREE.Color(baseColorHex).multiplyScalar(THREE.MathUtils.randFloat(0.85, 1.05)),
            roughness: THREE.MathUtils.randFloat(0.5, 0.65),
            metalness: 0.0,
            clearcoat: 0.1,
            clearcoatRoughness: 0.3,
            transmission: 0.25, // Translucidez para el contrailuminado de las puntas
            thickness: 0.05,
            side: THREE.DoubleSide,
            shadowSide: THREE.DoubleSide
        });

        const petalMesh = new THREE.Mesh(petalGeometries[type], petalMat);
        petalMesh.castShadow = true;
        petalMesh.receiveShadow = true;

        // Distribución matemática espacial (Phyllotaxis de Fibonacci adaptada a domo floral)
        const phi = i * 137.5 * (Math.PI / 180); 
        const radiusNormal = i / totalPetals;
        const radius = Math.pow(radiusNormal, 0.6) * 0.45;

        // Posicionamiento en coordenadas cilíndricas
        const px = Math.cos(phi) * radius;
        const pz = Math.sin(phi) * radius;
        // Altura cóncava interior
        const py = Math.pow(1.0 - radiusNormal, 2) * 0.25;

        petalMesh.position.set(px, py, pz);

        // Orientación orientada hacia el exterior del núcleo
        petalMesh.rotation.y = -phi + Math.PI / 2;
        
        // Inclinación adaptativa según madurez (capa)
        let pitch = 0.15; // Capas de protección cerradas
        if (type === 'middle') pitch = 0.5 + Math.random() * 0.2;
        else if (type === 'outer') pitch = 1.0 + Math.random() * 0.3; // Volcadas
        
        petalMesh.rotation.x = pitch;
        
        // Micro-variaciones biológicas aleatorias impredecibles
        const jitter = 0.05;
        petalMesh.rotation.x += THREE.MathUtils.randFloat(-jitter, jitter);
        petalMesh.rotation.y += THREE.MathUtils.randFloat(-jitter, jitter);
        petalMesh.rotation.z += THREE.MathUtils.randFloat(-jitter, jitter);

        // Escalado escalonado natural
        const baseScale = type === 'inner' ? 0.9 : type === 'middle' ? 1.2 : 1.5;
        const scaleRandom = baseScale + Math.random() * 0.15;
        petalMesh.scale.set(scaleRandom, scaleRandom, scaleRandom);

        roseGroup.add(petalMesh);
    }

    // Añadir el receptáculo de la flor (sépalos inferiores verdes protectores)
    const sepalMat = new THREE.MeshStandardMaterial({ color: 0x1e3318, roughness: 0.8 });
    for(let s=0; s<5; s++) {
        const sepal = new THREE.Mesh(petalGeometries['inner'], sepalMat);
        sepal.scale.set(0.8, 0.8, 0.8);
        const sAngle = (s / 5) * Math.PI * 2;
        sepal.position.set(Math.cos(sAngle)*0.15, -0.05, Math.sin(sAngle)*0.15);
        sepal.rotation.y = -sAngle + Math.PI/2;
        sepal.rotation.x = 1.4;
        roseGroup.add(sepal);
    }

    return roseGroup;
}

// ============================================================================
// MODELADO DEL RAMO COMPLETO (BOUQUET DE ALTA FLORISTERÍA)
// ============================================================================
const bouquetGroup = new THREE.Group();
const stemConvergencePoint = new THREE.Vector3(0, -2.5, 0);

// Paleta cromática hiperrealista de rosas de alta gama
const roseColors = [0xd92b4b, 0xe63956, 0xc21d38, 0xff4d6d, 0xfa2a55];

const numRoses = 19; // Estructura densa imperial
const rosePositions = [];

for (let i = 0; i < numRoses; i++) {
    const rose = buildProceduralRose(roseColors[i % roseColors.length]);
    
    let rx, ry, rz;
    let inclination, azimuth;

    if (i === 0) {
        // Rosa Central, corona principal más elevada
        rx = 0; ry = 1.2; rz = 0;
        rose.position.set(rx, ry, rz);
    } else {
        // Distribución esférica compacta uniforme (Cúpula Perfecta)
        const layer = i <= 6 ? 1 : 2; // Distribución en anillos concéntricos
        if(layer === 1) {
            inclination = 0.35;
            azimuth = (i / 6) * Math.PI * 2;
        } else {
            inclination = 0.75;
            azimuth = ((i - 6) / 12) * Math.PI * 2;
        }

        const radiusOffset = 1.1;
        rx = Math.sin(inclination) * Math.cos(azimuth) * radiusOffset;
        rz = Math.sin(inclination) * Math.sin(azimuth) * radiusOffset;
        ry = Math.cos(inclination) * radiusOffset * 0.8 + 0.3; // Compresión del domo vertical
        
        rose.position.set(rx, ry, rz);
        
        // Inclinación hacia el exterior simulando un amarre manual real
        rose.lookAt(new THREE.Vector3(rx * 2, ry + 0.3, rz * 2));
    }

    // Variaciones aleatorias orgánicas en la rotación del propio eje floral
    rose.rotation.z += Math.random() * Math.PI;
    const s = THREE.MathUtils.randFloat(0.95, 1.05);
    rose.scale.set(s,s,s);

    bouquetGroup.add(rose);
    rosePositions.push(new THREE.Vector3(rx, ry - 0.1, rz));

    // GENERACIÓN PROCEDURAL DE LOS TALLOS CONVERGENTES
    const stemCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(rx, ry - 0.1, rz),
        new THREE.Vector3(rx * 0.4, (ry + stemConvergencePoint.y) * 0.4, rz * 0.4),
        stemConvergencePoint
    ]);

    const stemGeo = new THREE.TubeGeometry(stemCurve, 12, 0.025, 6, false);
    const stemMat = new THREE.MeshStandardMaterial({ color: 0x152910, roughness: 0.9 });
    const stemMesh = new THREE.Mesh(stemGeo, stemMat);
    stemMesh.castShadow = true;
    bouquetGroup.add(stemMesh);
}

// ============================================================================
// ELEMENTOS COMPLEMENTARIOS: HOJAS SILVESTRES Y LAZO DE SATÉN
// ============================================================================

// Modelar follaje intersticial para rellenar espacios vacíos
function createLeafGeometry() {
    const geom = new THREE.PlaneGeometry(0.4, 0.7, 10, 10);
    const pos = geom.attributes.position;
    for(let i=0; i<pos.count; i++) {
        let x = pos.getX(i);
        let y = pos.getY(i) + 0.35;
        const u = x + 0.2; const v = y;
        x *= Math.sin(v*Math.PI); // Forma de lanza
        let z = Math.sin(v*Math.PI)*0.08 - Math.pow(x,2)*0.3; // Curva longitudinal y transversal
        pos.setXYZ(i, x, y, z);
    }
    geom.computeVertexNormals();
    return geom;
}
const leafGeo = createLeafGeometry();
const leafMat = new THREE.MeshStandardMaterial({ color: 0x24421b, roughness: 0.7, side: THREE.DoubleSide });

// Inserción de hojas entre las rosas perimetrales
rosePositions.forEach((pos, idx) => {
    if(idx > 0 && idx % 2 === 0) {
        const leafGroup = new THREE.Group();
        const leaf = new THREE.Mesh(leafGeo, leafMat);
        leaf.rotation.x = 1.0;
        leaf.rotation.z = Math.random();
        leafGroup.position.copy(pos).multiplyScalar(1.05);
        leafGroup.lookAt(new THREE.Vector3(pos.x*2, pos.y, pos.z*2));
        leafGroup.add(leaf);
        bouquetGroup.add(leafGroup);
    }
});

// CINTA DE SATÉN ROJA BRILLANTE (Nudo de unión en el punto de convergencia)
const ribbonGroup = new THREE.Group();
const ribbonMat = new THREE.MeshPhysicalMaterial({
    color: 0xb3001e,
    roughness: 0.18,
    metalness: 0.1,
    clearcoat: 1.0,
    clearcoatRoughness: 0.1,
    side: THREE.DoubleSide
});

// Anillo principal del nudo amarrado
const ribbonRingGeo = new THREE.TorusGeometry(0.14, 0.04, 12, 32);
const ribbonRing = new THREE.Mesh(ribbonRingGeo, ribbonMat);
ribbonRing.position.copy(stemConvergencePoint).add(new THREE.Vector3(0, 0.4, 0));
ribbonRing.rotation.x = Math.PI / 2;
ribbonGroup.add(ribbonRing);

// Caídas estilizadas de la cinta de satén
const ribbonTailCurveLeft = new THREE.CatmullRomCurve3([
    ribbonRing.position.clone(),
    ribbonRing.position.clone().add(new THREE.Vector3(-0.2, -0.4, 0.1)),
    ribbonRing.position.clone().add(new THREE.Vector3(-0.3, -1.0, 0.3))
]);
const ribbonTailLeft = new THREE.Mesh(new THREE.TubeGeometry(ribbonTailCurveLeft, 20, 0.02, 8, false), ribbonMat);
ribbonGroup.add(ribbonTailLeft);

const ribbonTailCurveRight = new THREE.CatmullRomCurve3([
    ribbonRing.position.clone(),
    ribbonRing.position.clone().add(new THREE.Vector3(0.15, -0.5, 0.15)),
    ribbonRing.position.clone().add(new THREE.Vector3(0.25, -0.9, 0.4))
]);
const ribbonTailRight = new THREE.Mesh(new THREE.TubeGeometry(ribbonTailCurveRight, 20, 0.02, 8, false), ribbonMat);
ribbonGroup.add(ribbonTailRight);

bouquetGroup.add(ribbonGroup);

// Posicionar el bouquet completo centrado verticalmente en el origen visual
bouquetGroup.position.y = -0.3;
scene.add(bouquetGroup);

// ============================================================================
// ESCENARIO ATMOSFÉRICO: LUCIÉRNAGAS Y PÉTALOS FLOTANTES
// ============================================================================

// 1. Partículas / Luciérnagas mágicas fijas en suspensión
const particleCount = 250;
const particleGeo = new THREE.BufferGeometry();
const particlePositions = new Float32Array(particleCount * 3);

for (let i = 0; i < particleCount * 3; i += 3) {
    particlePositions[i] = (Math.random() - 0.5) * 10;
    particlePositions[i + 1] = (Math.random() - 0.3) * 8;
    particlePositions[i + 2] = (Math.random() - 0.5) * 10;
}

particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));

// Textura procedimental circular destellante para las luciérnagas
const createFireflyTexture = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 32; canvas.height = 32;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    grad.addColorStop(0, 'rgba(255, 230, 240, 1)');
    grad.addColorStop(0.2, 'rgba(255, 77, 109, 0.6)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 32, 32);
    return new THREE.CanvasTexture(canvas);
};

const particleMat = new THREE.PointsMaterial({
    size: 0.08,
    map: createFireflyTexture(),
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
});

const fireflies = new THREE.Points(particleGeo, particleMat);
scene.add(fireflies);

// 2. Macro-pétalos independientes suspendidos flotando alrededor de la escena
const floatingPetalsCount = 12;
const floatingPetalsArray = [];

for(let i=0; i<floatingPetalsCount; i++) {
    const fMat = new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(roseColors[Math.floor(Math.random()*roseColors.length)]),
        roughness: 0.6,
        clearcoat: 0.1,
        side: THREE.DoubleSide
    });
    const fMesh = new THREE.Mesh(petalGeometries['middle'], fMat);
    fMesh.position.set(
        (Math.random() - 0.5) * 4,
        THREE.MathUtils.randFloat(1, 4),
        (Math.random() - 0.5) * 4
    );
    fMesh.rotation.set(Math.random()*Math.PI, Math.random()*Math.PI, 0);
    
    // Variables dinámicas personalizadas de cinemática individual
    fMesh.userData = {
        speedY: THREE.MathUtils.randFloat(0.003, 0.008),
        rotSpeed: THREE.MathUtils.randFloat(0.005, 0.015),
        seed: Math.random() * 100
    };
    scene.add(fMesh);
    floatingPetalsArray.push(fMesh);
}

// ============================================================================
// LÓGICA DE INTERACCIÓN DE LA INTERFAZ DE USUARIO (UI)
// ============================================================================

// Apertura/Cierre de la Tarjeta Virtual Romántica
const card = document.getElementById('romantic-card');
card.addEventListener('click', (e) => {
    // Evitar que el foco en el área de texto interfiera con el click estructural
    if (e.target.tagName === 'TEXTAREA') return;
    card.classList.toggle('is-open');
});

// Control e Inicialización de la Música de Fondo
const audioToggle = document.getElementById('audio-toggle');
const bgMusic = document.getElementById('bg-music');
const iconPlay = audioToggle.querySelector('.icon-play');
const iconPause = audioToggle.querySelector('.icon-pause');

audioToggle.addEventListener('click', () => {
    if (bgMusic.paused) {
        bgMusic.play().catch(err => console.log("Autoplay bloqueado por políticas del navegador. Requiere acción previa."));
        iconPlay.classList.add('hidden');
        iconPause.classList.remove('hidden');
        audioToggle.style.background = "rgba(217, 43, 75, 0.3)";
    } else {
        bgMusic.pause();
        iconPlay.classList.remove('hidden');
        iconPause.classList.add('hidden');
        audioToggle.style.background = "rgba(255, 255, 255, 0.05)";
    }
});

// ============================================================================
// BUCLE DE RENDERIZADO, ANIMACIONES Y SIMULACIÓN DE BRISA
// ============================================================================
const clock = new THREE.Clock();
let introAnimation = true;

function animate() {
    requestAnimationFrame(animate);
    
    const elapsedTime = clock.getElapsedTime();

    // 1. ANIMACIÓN INICIAL CINEMATOGRÁFICA (Aproximación lenta y majestuosa)
    if (introAnimation) {
        // Interpola suavemente la posición de la cámara hacia el bouquet
        camera.position.z = THREE.MathUtils.lerp(camera.position.z, 4.5, 0.015);
        camera.position.y = THREE.MathUtils.lerp(camera.position.y, 0.6, 0.015);
        camera.position.x = THREE.MathUtils.lerp(camera.position.x, 0.0, 0.015);
        if (Math.abs(camera.position.z - 4.5) < 0.05) {
            introAnimation = false; // Ceder control total interactivo a OrbitControls
        }
    }

    // 2. SIMULACIÓN DE BRISA LIGERA (Oscilación sinusoidal armónica)
    const breezeAngle = Math.sin(elapsedTime * 0.8) * 0.03;
    const breezeTilt = Math.cos(elapsedTime * 0.5) * 0.02;
    
    bouquetGroup.rotation.z = breezeAngle;
    bouquetGroup.rotation.x = breezeTilt;

    // 3. MOVIMIENTO ORGÁNICO DE LAS LUCIÉRNAGAS (Fluctuación tridimensional)
    const posArr = fireflies.geometry.attributes.position.array;
    for (let i = 0; i < posArr.length; i += 3) {
        // Aplicar pequeños desplazamientos ondulantes basados en funciones trigonométricas continuas
        posArr[i + 1] += Math.sin(elapsedTime + posArr[i]) * 0.0015; // Flotación vertical
    }
    fireflies.geometry.attributes.position.needsUpdate = true;

    // 4. ANIMACIÓN DE CAÍDA Y ROTACIÓN DE PÉTALOS SUELTOS
    floatingPetalsArray.forEach(petal => {
        petal.position.y -= petal.userData.speedY;
        petal.rotation.x += petal.userData.rotSpeed;
        petal.rotation.y += petal.userData.rotSpeed * 0.5;
        
        // Efecto meandro oscilatorio lateral (Simulación de resistencia aerodinámica)
        petal.position.x += Math.sin(elapsedTime + petal.userData.seed) * 0.003;

        // Bucle infinito: si el pétalo toca fondo, se regenera en la parte superior
        if(petal.position.y < -2) {
            petal.position.y = THREE.MathUtils.randFloat(2.5, 4.5);
            petal.position.x = (Math.random() - 0.5) * 4;
            petal.position.z = (Math.random() - 0.5) * 4;
        }
    });

    controls.update();
    renderer.render(scene, camera);
}

// ============================================================================
// DISEÑO ADAPTATIVO (RESIZE HANDLING)
// ============================================================================
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

// Inicialización del motor
animate();