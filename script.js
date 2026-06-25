const container = document.getElementById('canvas-container');
const scene = new THREE.Scene();

scene.fog = new THREE.FogExp2(0x05020c, 0.12);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 2, 15); // Posición inicial un poco más lejana

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
container.appendChild(renderer.domElement);

const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.maxPolarAngle = Math.PI / 2 + 0.3;
// Límite de zoom manual para que el usuario no atraviese el ramo
controls.minDistance = 4.5; 
controls.maxDistance = 15;
controls.enabled = false; // Desactivados temporalmente durante la intro

const ambientLight = new THREE.AmbientLight(0x1a0f2e, 1.5);
scene.add(ambientLight);

const keyLight = new THREE.DirectionalLight(0xffe5ec, 2.5);
keyLight.position.set(5, 8, 5);
keyLight.castShadow = true;
keyLight.shadow.mapSize.width = 1024; 
keyLight.shadow.mapSize.height = 1024;
keyLight.shadow.camera.near = 0.5;
keyLight.shadow.camera.far = 20;
keyLight.shadow.bias = -0.001;
scene.add(keyLight);

const fillLight = new THREE.DirectionalLight(0x3a1c66, 2.0);
fillLight.position.set(-6, 3, 2);
scene.add(fillLight);

const rimLight = new THREE.DirectionalLight(0xff3366, 4.0);
rimLight.position.set(0, 4, -8);
scene.add(rimLight);

const bouquetSpot = new THREE.SpotLight(0xff99b4, 5, 10, Math.PI / 4, 0.5, 1);
bouquetSpot.position.set(0, 5, 2);
scene.add(bouquetSpot);

// Geometría optimizada drásticamente (de 24x24 a 8x8 segmentos)
function createPetalGeometry(layerType) {
    const segmentsX = 8;
    const segmentsY = 8;
    const geometry = new THREE.PlaneGeometry(1, 1, segmentsX, segmentsY);
    
    let width, height, cupDepth, edgeCurl, flare;

    if (layerType === 'inner') {
        width = 0.35; height = 0.55; cupDepth = 0.35; edgeCurl = 0.02; flare = -0.1;
    } else if (layerType === 'middle') {
        width = 0.65; height = 0.75; cupDepth = 0.45; edgeCurl = 0.15; flare = 0.2;
    } else {
        width = 0.95; height = 0.85; cupDepth = 0.30; edgeCurl = 0.35; flare = 0.5;
    }

    const posAttr = geometry.attributes.position;
    
    for (let i = 0; i < posAttr.count; i++) {
        let x = posAttr.getX(i);
        let y = posAttr.getY(i) + 0.5;

        const u = x + 0.5;
        const v = y;

        const taper = Math.sin(v * Math.PI) * (1.0 + flare * v);
        x *= width * taper;
        y *= height;

        const zCup = Math.sin(v * Math.PI) * cupDepth;
        const zLip = Math.pow(Math.abs(u - 0.5) * 2, 2.5) * edgeCurl * Math.pow(v, 2);
        const z = zCup - zLip;

        posAttr.setXYZ(i, x, y, z);
    }
    
    geometry.computeVertexNormals();
    return geometry;
}

const petalGeometries = {
    inner: createPetalGeometry('inner'),
    middle: createPetalGeometry('middle'),
    outer: createPetalGeometry('outer')
};

function buildProceduralRose(baseColorHex) {
    const roseGroup = new THREE.Group();
    const totalPetals = 40;

    for (let i = 0; i < totalPetals; i++) {
        let type = 'inner';
        if (i >= 10 && i < 25) type = 'middle';
        else if (i >= 25) type = 'outer';

        const petalMat = new THREE.MeshStandardMaterial({
            color: new THREE.Color(baseColorHex).multiplyScalar(THREE.MathUtils.randFloat(0.85, 1.05)),
            roughness: THREE.MathUtils.randFloat(0.7, 0.9),
            side: THREE.DoubleSide
        });

        const petalMesh = new THREE.Mesh(petalGeometries[type], petalMat);
        petalMesh.castShadow = true;
        petalMesh.receiveShadow = false;

        const phi = i * 137.5 * (Math.PI / 180); 
        const radiusNormal = i / totalPetals;
        const radius = Math.pow(radiusNormal, 0.6) * 0.45;

        const px = Math.cos(phi) * radius;
        const pz = Math.sin(phi) * radius;
        const py = Math.pow(1.0 - radiusNormal, 2) * 0.25;

        petalMesh.position.set(px, py, pz);
        petalMesh.rotation.y = -phi + Math.PI / 2;
        
        let pitch = 0.15;
        if (type === 'middle') pitch = 0.5 + Math.random() * 0.2;
        else if (type === 'outer') pitch = 1.0 + Math.random() * 0.3;
        
        petalMesh.rotation.x = pitch;
        
        const jitter = 0.05;
        petalMesh.rotation.x += THREE.MathUtils.randFloat(-jitter, jitter);
        petalMesh.rotation.y += THREE.MathUtils.randFloat(-jitter, jitter);
        petalMesh.rotation.z += THREE.MathUtils.randFloat(-jitter, jitter);

        const baseScale = type === 'inner' ? 0.9 : type === 'middle' ? 1.2 : 1.5;
        const scaleRandom = baseScale + Math.random() * 0.15;
        petalMesh.scale.set(scaleRandom, scaleRandom, scaleRandom);

        roseGroup.add(petalMesh);
    }

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

const bouquetGroup = new THREE.Group();
const stemConvergencePoint = new THREE.Vector3(0, -2.5, 0);
const roseColors = [0xd92b4b, 0xe63956, 0xc21d38, 0xff4d6d, 0xfa2a55];

const numRoses = 19;
const rosePositions = [];

for (let i = 0; i < numRoses; i++) {
    const rose = buildProceduralRose(roseColors[i % roseColors.length]);
    let rx, ry, rz, inclination, azimuth;

    if (i === 0) {
        rx = 0; ry = 1.2; rz = 0;
        rose.position.set(rx, ry, rz);
    } else {
        const layer = i <= 6 ? 1 : 2;
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
        ry = Math.cos(inclination) * radiusOffset * 0.8 + 0.3;
        
        rose.position.set(rx, ry, rz);
        rose.lookAt(new THREE.Vector3(rx * 2, ry + 0.3, rz * 2));
    }

    rose.rotation.z += Math.random() * Math.PI;
    const s = THREE.MathUtils.randFloat(0.95, 1.05);
    rose.scale.set(s, s, s);

    bouquetGroup.add(rose);
    rosePositions.push(new THREE.Vector3(rx, ry - 0.1, rz));

    const stemCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(rx, ry - 0.1, rz),
        new THREE.Vector3(rx * 0.4, (ry + stemConvergencePoint.y) * 0.4, rz * 0.4),
        stemConvergencePoint
    ]);

    const stemGeo = new THREE.TubeGeometry(stemCurve, 8, 0.025, 5, false);
    const stemMat = new THREE.MeshStandardMaterial({ color: 0x152910, roughness: 0.9 });
    const stemMesh = new THREE.Mesh(stemGeo, stemMat);
    stemMesh.castShadow = true;
    bouquetGroup.add(stemMesh);
}

function createLeafGeometry() {
    const geom = new THREE.PlaneGeometry(0.4, 0.7, 6, 6); 
    const pos = geom.attributes.position;
    for(let i=0; i<pos.count; i++) {
        let x = pos.getX(i);
        let y = pos.getY(i) + 0.35;
        const u = x + 0.2; const v = y;
        x *= Math.sin(v*Math.PI);
        let z = Math.sin(v*Math.PI)*0.08 - Math.pow(x,2)*0.3;
        pos.setXYZ(i, x, y, z);
    }
    geom.computeVertexNormals();
    return geom;
}

const leafGeo = createLeafGeometry();
const leafMat = new THREE.MeshStandardMaterial({ color: 0x24421b, roughness: 0.7, side: THREE.DoubleSide });

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

const ribbonGroup = new THREE.Group();
const ribbonMat = new THREE.MeshStandardMaterial({
    color: 0xb3001e,
    roughness: 0.4,
    side: THREE.DoubleSide
});

const ribbonRingGeo = new THREE.TorusGeometry(0.14, 0.04, 8, 20); 
const ribbonRing = new THREE.Mesh(ribbonRingGeo, ribbonMat);
ribbonRing.position.copy(stemConvergencePoint).add(new THREE.Vector3(0, 0.4, 0));
ribbonRing.rotation.x = Math.PI / 2;
ribbonGroup.add(ribbonRing);

const ribbonTailCurveLeft = new THREE.CatmullRomCurve3([
    ribbonRing.position.clone(),
    ribbonRing.position.clone().add(new THREE.Vector3(-0.2, -0.4, 0.1)),
    ribbonRing.position.clone().add(new THREE.Vector3(-0.3, -1.0, 0.3))
]);
const ribbonTailLeft = new THREE.Mesh(new THREE.TubeGeometry(ribbonTailCurveLeft, 12, 0.02, 6, false), ribbonMat);
ribbonGroup.add(ribbonTailLeft);

const ribbonTailCurveRight = new THREE.CatmullRomCurve3([
    ribbonRing.position.clone(),
    ribbonRing.position.clone().add(new THREE.Vector3(0.15, -0.5, 0.15)),
    ribbonRing.position.clone().add(new THREE.Vector3(0.25, -0.9, 0.4))
]);
const ribbonTailRight = new THREE.Mesh(new THREE.TubeGeometry(ribbonTailCurveRight, 12, 0.02, 6, false), ribbonMat);
ribbonGroup.add(ribbonTailRight);

bouquetGroup.add(ribbonGroup);
bouquetGroup.position.y = -0.3;
scene.add(bouquetGroup);

const particleCount = 150; 
const particleGeo = new THREE.BufferGeometry();
const particlePositions = new Float32Array(particleCount * 3);

for (let i = 0; i < particleCount * 3; i += 3) {
    particlePositions[i] = (Math.random() - 0.5) * 10;
    particlePositions[i + 1] = (Math.random() - 0.3) * 8;
    particlePositions[i + 2] = (Math.random() - 0.5) * 10;
}
particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));

const createFireflyTexture = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 16; canvas.height = 16; 
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(8, 8, 0, 8, 8, 8);
    grad.addColorStop(0, 'rgba(255, 230, 240, 1)');
    grad.addColorStop(0.2, 'rgba(255, 77, 109, 0.6)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 16, 16);
    return new THREE.CanvasTexture(canvas);
};

const particleMat = new THREE.PointsMaterial({
    size: 0.1,
    map: createFireflyTexture(),
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
});

const fireflies = new THREE.Points(particleGeo, particleMat);
scene.add(fireflies);

const floatingPetalsCount = 10;
const floatingPetalsArray = [];

for(let i=0; i<floatingPetalsCount; i++) {
    const fMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(roseColors[Math.floor(Math.random()*roseColors.length)]),
        roughness: 0.7,
        side: THREE.DoubleSide
    });
    const fMesh = new THREE.Mesh(petalGeometries['middle'], fMat);
    fMesh.position.set((Math.random() - 0.5) * 4, THREE.MathUtils.randFloat(1, 4), (Math.random() - 0.5) * 4);
    fMesh.rotation.set(Math.random()*Math.PI, Math.random()*Math.PI, 0);
    fMesh.userData = {
        speedY: THREE.MathUtils.randFloat(0.003, 0.008),
        rotSpeed: THREE.MathUtils.randFloat(0.005, 0.015),
        seed: Math.random() * 100
    };
    scene.add(fMesh);
    floatingPetalsArray.push(fMesh);
}

const card = document.getElementById('romantic-card');
card.addEventListener('click', (e) => {
    if (e.target.tagName === 'TEXTAREA') return;
    card.classList.toggle('is-open');
});

const clock = new THREE.Clock();
let introAnimation = true;

function animate() {
    requestAnimationFrame(animate);
    const elapsedTime = clock.getElapsedTime();

    if (introAnimation) {
        // Zoom más rápido (0.03) y con un límite más alejado (z: 7.5)
        camera.position.z = THREE.MathUtils.lerp(camera.position.z, 7.5, 0.03);
        camera.position.y = THREE.MathUtils.lerp(camera.position.y, 1.2, 0.03);
        camera.position.x = THREE.MathUtils.lerp(camera.position.x, 0.0, 0.03);
        
        camera.lookAt(0, 0, 0); // Forzar la vista al centro durante la intro

        if (Math.abs(camera.position.z - 7.5) < 0.05) {
            introAnimation = false;
            controls.enabled = true; // Devolver el control al usuario
        }
    }

    bouquetGroup.rotation.z = Math.sin(elapsedTime * 0.8) * 0.03;
    bouquetGroup.rotation.x = Math.cos(elapsedTime * 0.5) * 0.02;

    const posArr = fireflies.geometry.attributes.position.array;
    for (let i = 0; i < posArr.length; i += 3) {
        posArr[i + 1] += Math.sin(elapsedTime + posArr[i]) * 0.0015;
    }
    fireflies.geometry.attributes.position.needsUpdate = true;

    floatingPetalsArray.forEach(petal => {
        petal.position.y -= petal.userData.speedY;
        petal.rotation.x += petal.userData.rotSpeed;
        petal.rotation.y += petal.userData.rotSpeed * 0.5;
        petal.position.x += Math.sin(elapsedTime + petal.userData.seed) * 0.003;

        if(petal.position.y < -2) {
            petal.position.y = THREE.MathUtils.randFloat(2.5, 4.5);
            petal.position.x = (Math.random() - 0.5) * 4;
            petal.position.z = (Math.random() - 0.5) * 4;
        }
    });

    controls.update();
    renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

animate();