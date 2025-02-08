import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

let scene, camera, renderer, controls;
const planets = {};
let planetLabels = {}; // Store planet labels
let labelsVisible = false; // Track label visibility
let composer;
let selectedPlanet = null;
let infoPanel = null;
let animationSpeed = 1.0;
let isPaused = false;
let trackingPlanet = null;
let startTracking = false;
let trackingStartTime = 0;

// Add texture loader
const textureLoader = new THREE.TextureLoader();

// Load all textures
const textures = {
    sun: textureLoader.load('planets textures/8k_sun.jpg'),
    mercury: textureLoader.load('planets textures/8k_mercury.jpg'),
    venus: textureLoader.load('planets textures/8k_venus_surface.jpg'),
    earth: {
        map: textureLoader.load('planets textures/8k_earth_daymap.jpg'),
        night: textureLoader.load('planets textures/8k_earth_nightmap.jpg'),
        clouds: textureLoader.load('planets textures/8k_earth_clouds.jpg')
    },
    mars: textureLoader.load('planets textures/8k_mars.jpg'),
    jupiter: textureLoader.load('planets textures/8k_jupiter.jpg'),
    saturn: {
        planet: textureLoader.load('planets textures/8k_saturn.jpg'),
        rings: textureLoader.load('planets textures/8k_saturn_ring_alpha.png')
    },
    uranus: textureLoader.load('planets textures/2k_uranus.jpg'),
    neptune: textureLoader.load('planets textures/2k_neptune.jpg'),
    moon: textureLoader.load('planets textures/8k_moon.jpg'),
    stars: textureLoader.load('planets textures/8k_stars_milky_way.jpg')
};

const CONFIG = {
    camera: {
        fov: 45,
        near: 0.1,
        far: 2000,
        initialPosition: [200, 200, 400]
    },
    controls: {
        dampingFactor: 0.05,
        maxDistance: 1000,
        minDistance: 50
    },
    animation: {
        defaultSpeed: 1.0,
        maxSpeed: 2.0
    },
    rendering: {
        bloomStrength: 0.5,
        bloomRadius: 0.4,
        bloomThreshold: 0.85
    }
};

// Planet data with real proportions (scaled down)
const PLANET_DATA = {
    sun: {
        size: 20,
        color: 0xffdd00,
        emissive: true,
        glow: 2.0
    },
    mercury: {
        size: 0.383,
        distance: 39,
        period: 0.24,
        color: 0x8c8c8c,
        rotationPeriod: 58.6,
        glow: 0.4
    },
    venus: {
        size: 0.949,
        distance: 72,
        period: 0.62,
        color: 0xffd085,
        rotationPeriod: -243,
        glow: 0.5
    },
    earth: {
        size: 1,
        distance: 100,
        period: 1,
        color: 0x2233ff,
        rotationPeriod: 1,
        tilt: 23.5,
        glow: 0.6,
        moon: {
            size: 0.27,        // Moon is about 27% the size of Earth
            distance: 5,       // Distance from Earth
            period: 0.27,      // Adjusted to be more realistic (27 days / Earth's year)
            color: 0xbbbbbb,
            glow: 0.3
        }
    },
    mars: {
        size: 0.532,
        distance: 152,
        period: 1.88,
        color: 0xff4400,
        rotationPeriod: 1.03,
        glow: 0.5
    },
    jupiter: {
        size: 11.21,
        distance: 260,
        period: 11.86,
        color: 0xffaa88,
        rotationPeriod: 0.41,
        glow: 0.6
    },
    saturn: {
        size: 16.8,
        distance: 320,
        period: 29.46,
        color: 0xffcc99,
        rotationPeriod: 0.44,
        rings: {
            inner: 1.6,
            outer: 2.5
        },
        glow: 0.5
    },
    uranus: {
        size: 4,
        distance: 380,
        period: 84,
        color: 0x99ffff,
        rotationPeriod: 0.72,
        tilt: 97.77,
        glow: 0.5
    },
    neptune: {
        size: 3.88,
        distance: 440,
        period: 164.79,
        color: 0x3333ff,
        rotationPeriod: 0.67,
        glow: 0.5
    }
};

// Add moon to the planets object
let moon;
let moonHolder;

// Add this detailed planet information object
const PLANET_INFO = {
    sun: {
        type: 'Star',
        mass: '1.989 × 10^30 kg',
        diameter: '1,392,700 km',
        surfaceTemp: '5,500°C (surface)',
        rotationPeriod: '27 Earth days',
        description: 'The Sun is the star at the center of our Solar System, providing light and energy to all planets.',
        funFact: 'The Sun contains 99.86% of all mass in our solar system!'
    },
    mercury: {
        type: 'Terrestrial Planet',
        mass: '3.285 × 10^23 kg',
        diameter: '4,879 km',
        orbitalPeriod: '88 Earth days',
        surfaceTemp: '-180°C to 430°C',
        description: 'Mercury is the smallest planet and closest to the Sun.',
        funFact: 'Despite being closest to the Sun, Venus is actually hotter than Mercury!'
    },
    venus: {
        type: 'Terrestrial Planet',
        mass: '4.867 × 10^24 kg',
        diameter: '12,104 km',
        orbitalPeriod: '225 Earth days',
        surfaceTemp: '462°C',
        description: 'Venus is often called Earth\'s sister planet due to their similar sizes.',
        funFact: 'Venus spins backwards compared to most other planets!'
    },
    earth: {
        type: 'Terrestrial Planet',
        mass: '5.972 × 10^24 kg',
        diameter: '12,742 km',
        orbitalPeriod: '365.25 days',
        surfaceTemp: '-88°C to 58°C',
        description: 'Earth is the only known planet to support life.',
        funFact: 'Earth is the only planet not named after a god or goddess!'
    },
    mars: {
        type: 'Terrestrial Planet',
        mass: '6.39 × 10^23 kg',
        diameter: '6,779 km',
        orbitalPeriod: '687 Earth days',
        surfaceTemp: '-140°C to 20°C',
        description: 'Mars is called the Red Planet due to iron oxide (rust) on its surface.',
        funFact: 'Mars has the largest volcano in the solar system - Olympus Mons!'
    },
    jupiter: {
        type: 'Gas Giant',
        mass: '1.898 × 10^27 kg',
        diameter: '139,820 km',
        orbitalPeriod: '11.9 Earth years',
        surfaceTemp: '-110°C',
        description: 'Jupiter is the largest planet in our solar system.',
        funFact: 'Jupiter\'s Great Red Spot has been storming for at least 400 years!'
    },
    saturn: {
        type: 'Gas Giant',
        mass: '5.683 × 10^26 kg',
        diameter: '116,460 km',
        orbitalPeriod: '29.5 Earth years',
        surfaceTemp: '-140°C',
        description: 'Saturn is known for its spectacular ring system.',
        funFact: 'Saturn has 82 moons - the most of any planet in our solar system!'
    },
    uranus: {
        type: 'Ice Giant',
        mass: '8.681 × 10^25 kg',
        diameter: '50,724 km',
        orbitalPeriod: '84 Earth years',
        surfaceTemp: '-195°C',
        description: 'Uranus is the only planet that rotates on its side.',
        funFact: 'Uranus was the first planet discovered using a telescope!'
    },
    neptune: {
        type: 'Ice Giant',
        mass: '1.024 × 10^26 kg',
        diameter: '49,244 km',
        orbitalPeriod: '165 Earth years',
        surfaceTemp: '-200°C',
        description: 'Neptune is the windiest planet, with speeds reaching 2,100 km/h.',
        funFact: 'Neptune was discovered through mathematical predictions!'
    },
    moon: {
        type: 'Natural Satellite',
        mass: '7.342 × 10^22 kg',
        diameter: '3,474 km',
        orbitalPeriod: '27.3 Earth days',
        surfaceTemp: '-233°C to 123°C',
        description: 'The Moon is Earth\'s only natural satellite.',
        funFact: 'The Moon is slowly moving away from Earth at about 3.8 cm per year!'
    }
};

// Add these orbit colors at the top with your other constants
const ORBIT_COLORS = {
    mercury: 0x666666,
    venus: 0x997766,
    earth: 0x6666ff,
    mars: 0xff6666,
    jupiter: 0xffaa66,
    saturn: 0xffcc99,
    uranus: 0x99ffff,
    neptune: 0x3333ff
};

function init() {
    // Create scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);

    // Create camera
    camera = new THREE.PerspectiveCamera(CONFIG.camera.fov, window.innerWidth / window.innerHeight, CONFIG.camera.near, CONFIG.camera.far);
    camera.position.set(CONFIG.camera.initialPosition[0], CONFIG.camera.initialPosition[1], CONFIG.camera.initialPosition[2]);

    // Create renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    document.body.appendChild(renderer.domElement);

    // Create controls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = CONFIG.controls.dampingFactor;

    // Set minimum and maximum zoom distances
    controls.minDistance = 50;  // Minimum zoom (closest to objects)
    controls.maxDistance = 1000; // Maximum zoom (furthest from objects)

    // Optional: Add boundaries for vertical rotation
    controls.minPolarAngle = Math.PI * 0.1; // About 18 degrees from top
    controls.maxPolarAngle = Math.PI * 0.9; // About 162 degrees from top

    // Optional: Limit horizontal rotation if desired
    // controls.minAzimuthAngle = -Math.PI / 2; // -90 degrees
    // controls.maxAzimuthAngle = Math.PI / 2;  // 90 degrees

    // Add toggle button for labels
    createToggleButton();

    // Add bloom effect
    setupBloomEffect();

    createSolarSystem();
    createPlanetLabels();
    createLighting();
    createStarfield();
    createInfoPanel();
    setupClickDetection();
    createSpeedControls();

    window.addEventListener('resize', onWindowResize, false);
}

// Update the lighting function
function createLighting() {
    // Brighter ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);  // Increased to 0.6
    scene.add(ambientLight);

    // Brighter sun light
    const sunLight = new THREE.PointLight(0xffffff, 5, 1000);  // Increased to 5
    scene.add(sunLight);

    // Add multiple directional lights for better visibility
    const directions = [
        { pos: [1, 0, 0], intensity: 0.8 },
        { pos: [-1, 0, 0], intensity: 0.8 },
        { pos: [0, 1, 0], intensity: 0.8 },
        { pos: [0, -1, 0], intensity: 0.8 },
        { pos: [0, 0, 1], intensity: 1 },
        { pos: [0, 0, -1], intensity: 0.8 }
    ];

    directions.forEach(dir => {
        const light = new THREE.DirectionalLight(0xffffff, dir.intensity);
        light.position.set(...dir.pos);
        scene.add(light);
    });
}

function createSolarSystem() {
    // Create Sun with enhanced glow and texture
    const sunGeometry = new THREE.SphereGeometry(PLANET_DATA.sun.size, 64, 64);
    const sunMaterial = new THREE.MeshBasicMaterial({
        map: textures.sun,
        emissive: PLANET_DATA.sun.color,
        emissiveMap: textures.sun,
        emissiveIntensity: 1
    });
    planets.sun = new THREE.Mesh(sunGeometry, sunMaterial);
    scene.add(planets.sun);

    // Create planets with enhanced materials and textures
    for (const [name, data] of Object.entries(PLANET_DATA)) {
        if (name === 'sun') continue;

        const geometry = new THREE.SphereGeometry(data.size, 64, 64);
        let material;

        if (name === 'earth') {
            material = new THREE.MeshPhongMaterial({
                map: textures.earth.map,
                specular: new THREE.Color(0x333333),
                shininess: 25
            });
        } else if (name === 'saturn') {
            material = new THREE.MeshPhongMaterial({
                map: textures.saturn.planet,
                bumpScale: 0.05,
                specular: new THREE.Color(0x333333),
                shininess: 15
            });
        } else {
            material = new THREE.MeshPhongMaterial({
                map: textures[name],
                bumpScale: 0.05,
                specular: new THREE.Color(0x333333),
                shininess: 15
            });
        }

        const planet = new THREE.Mesh(geometry, material);
        planet.castShadow = true;
        planet.receiveShadow = true;

        // Create atmosphere for Earth
        if (name === 'earth') {
            const atmosphere = createAtmosphere(data.size * 1.01);
            planet.add(atmosphere);

            // Add clouds
            const cloudGeometry = new THREE.SphereGeometry(data.size * 1.02, 64, 64);
            const cloudMaterial = new THREE.MeshPhongMaterial({
                map: textures.earth.clouds,
                transparent: true,
                opacity: 0.8
            });
            const clouds = new THREE.Mesh(cloudGeometry, cloudMaterial);
            planet.add(clouds);
        }

        // Create orbit with unique color and better visibility
        const orbitGeometry = new THREE.RingGeometry(data.distance, data.distance + (data.size < 1 ? 0.3 : 0.2), 128);
        const orbitMaterial = new THREE.MeshBasicMaterial({
            color: ORBIT_COLORS[name],
            side: THREE.DoubleSide,
            transparent: true,
            opacity: data.size < 1 ? 0.8 : 0.7,  // More visible for small planets
            depthWrite: false  // Ensures orbit is always visible
        });
        const orbit = new THREE.Mesh(orbitGeometry, orbitMaterial);
        orbit.rotation.x = Math.PI / 2;
        scene.add(orbit);

        // Add orbit line glow effect with adjusted size for small planets
        const orbitGlowGeometry = new THREE.RingGeometry(
            data.distance - (data.size < 1 ? 0.2 : 0.1),
            data.distance + (data.size < 1 ? 0.4 : 0.3),
            128
        );
        const orbitGlowMaterial = new THREE.MeshBasicMaterial({
            color: ORBIT_COLORS[name],
            side: THREE.DoubleSide,
            transparent: true,
            opacity: data.size < 1 ? 0.4 : 0.3,  // More visible for small planets
            depthWrite: false
        });
        const orbitGlow = new THREE.Mesh(orbitGlowGeometry, orbitGlowMaterial);
        orbitGlow.rotation.x = Math.PI / 2;
        scene.add(orbitGlow);

        // Position planet
        planet.position.x = data.distance;

        // Create holder for rotation
        const holder = new THREE.Object3D();
        holder.add(planet);

        // Apply tilt if specified
        if (data.tilt) {
            planet.rotation.x = THREE.MathUtils.degToRad(data.tilt);
        }

        // Add Saturn's rings
        if (name === 'saturn') {
            const rings = createSaturnRings(data);
            planet.add(rings);
        }

        scene.add(holder);
        planets[name] = {
            mesh: planet,
            holder: holder,
            data: data
        };
    }

    // Add Moon after Earth is created
    if (planets.earth) {
        createMoon();
    }
}

function createAtmosphere(radius) {
    const geometry = new THREE.SphereGeometry(radius, 64, 64);
    const material = new THREE.ShaderMaterial({
        vertexShader: `
            varying vec3 vNormal;
            void main() {
                vNormal = normalize(normalMatrix * normal);
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            varying vec3 vNormal;
            void main() {
                float intensity = pow(0.7 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
                gl_FragColor = vec4(0.3, 0.6, 1.0, 1.0) * intensity;
            }
        `,
        blending: THREE.AdditiveBlending,
        side: THREE.BackSide,
        transparent: true
    });
    return new THREE.Mesh(geometry, material);
}

function createSaturnRings(data) {
    const innerRadius = data.size * data.rings.inner;
    const outerRadius = data.size * data.rings.outer;

    const ringsGroup = new THREE.Group();
    const ringCount = 8;
    const ringGap = (outerRadius - innerRadius) / ringCount;

    for (let i = 0; i < ringCount; i++) {
        const r1 = innerRadius + (ringGap * i);
        const r2 = r1 + ringGap * 0.95;

        const ringGeometry = new THREE.RingGeometry(r1, r2, 128);
        const ringMaterial = new THREE.MeshPhongMaterial({
            map: textures.saturn.rings,
            transparent: true,
            opacity: 0.85,
            side: THREE.DoubleSide,
            color: 0xffffff,
            emissive: 0x222222,
            emissiveIntensity: 0.1
        });

        const ring = new THREE.Mesh(ringGeometry, ringMaterial);
        ring.rotation.x = Math.PI / 2;

        ring.rotation.z = THREE.MathUtils.degToRad(26.7);

        ringsGroup.add(ring);
    }

    return ringsGroup;
}

function createStarfield() {
    const starGeometry = new THREE.SphereGeometry(1000, 64, 64);
    const starMaterial = new THREE.MeshBasicMaterial({
        map: textures.stars,
        side: THREE.BackSide
    });
    const starfield = new THREE.Mesh(starGeometry, starMaterial);
    scene.add(starfield);

    const pointStarGeometry = new THREE.BufferGeometry();
    const starCount = 10000;
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount * 3; i += 3) {
        positions[i] = (Math.random() - 0.5) * 2000;
        positions[i + 1] = (Math.random() - 0.5) * 2000;
        positions[i + 2] = (Math.random() - 0.5) * 2000;

        const brightness = 0.5 + Math.random() * 0.5;
        colors[i] = brightness;
        colors[i + 1] = brightness;
        colors[i + 2] = brightness;
    }

    pointStarGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    pointStarGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const pointStarMaterial = new THREE.PointsMaterial({
        size: 2,
        vertexColors: true,
        transparent: true,
        opacity: 0.8
    });

    const pointStars = new THREE.Points(pointStarGeometry, pointStarMaterial);
    scene.add(pointStars);
}

function createToggleButton() {
    const button = document.createElement('button');
    button.innerHTML = 'Show Planet Names';
    button.style.position = 'absolute';
    button.style.bottom = '20px';
    button.style.left = '50%';
    button.style.transform = 'translateX(-50%)';
    button.style.padding = '10px 20px';
    button.style.backgroundColor = '#444';
    button.style.color = 'white';
    button.style.border = 'none';
    button.style.borderRadius = '5px';
    button.style.cursor = 'pointer';
    button.style.zIndex = '1000';
    button.style.fontFamily = 'Arial, sans-serif';

    button.addEventListener('mouseenter', () => {
        button.style.backgroundColor = '#666';
    });
    button.addEventListener('mouseleave', () => {
        button.style.backgroundColor = '#444';
    });

    button.addEventListener('click', toggleLabels);
    document.body.appendChild(button);
}

function createPlanetLabels() {
    Object.entries(planets).forEach(([name, planet]) => {
        const div = document.createElement('div');
        div.className = 'planet-label';
        div.textContent = name.charAt(0).toUpperCase() + name.slice(1);
        div.style.position = 'absolute';
        div.style.color = 'white';
        div.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        div.style.borderRadius = '3px';
        div.style.fontFamily = 'Arial, sans-serif';
        div.style.fontSize = '12px';
        div.style.pointerEvents = 'none';
        div.style.display = 'none';
        div.style.transition = 'all 0.1s ease-out';
        div.style.zIndex = '1000';

        document.body.appendChild(div);
        planetLabels[name] = div;
    });

    // Create moon label
    const moonLabel = document.createElement('div');
    moonLabel.className = 'planet-label';
    moonLabel.textContent = 'Moon';
    moonLabel.style.position = 'absolute';
    moonLabel.style.color = 'white';
    moonLabel.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    moonLabel.style.borderRadius = '3px';
    moonLabel.style.fontFamily = 'Arial, sans-serif';
    moonLabel.style.fontSize = '12px';
    moonLabel.style.pointerEvents = 'none';
    moonLabel.style.display = 'none';
    moonLabel.style.transition = 'all 0.1s ease-out';
    moonLabel.style.zIndex = '1000';

    document.body.appendChild(moonLabel);
    planetLabels.moon = moonLabel;
}

function toggleLabels() {
    labelsVisible = !labelsVisible;
    const button = document.querySelector('button');
    button.innerHTML = labelsVisible ? 'Hide Planet Names' : 'Show Planet Names';

    Object.values(planetLabels).forEach(label => {
        label.style.display = labelsVisible ? 'block' : 'none';
    });
}

function updatePlanets() {
    if (isPaused) return;

    const time = performance.now() * 0.001 * animationSpeed;

    // Update all planet positions and rotations
    Object.entries(planets).forEach(([name, planet]) => {
        if (name === 'sun') return;

        const data = planet.data;

        // Update orbital position
        const angle = (time / data.period) * 0.5;
        planet.holder.rotation.y = angle;
        planet.mesh.position.x = data.distance;

        // Update planet rotation
        if (data.rotationPeriod) {
            planet.mesh.rotation.y = (time / data.rotationPeriod) * 2;
        }
    });

    // Update moon position
    if (moonHolder) {
        const moonAngle = (time / PLANET_DATA.earth.moon.period) * 2;
        moonHolder.rotation.y = moonAngle;
    }
}

function updateLabels() {
    if (!labelsVisible) return;

    // Update planet labels
    Object.entries(planets).forEach(([name, planet]) => {
        const worldPosition = new THREE.Vector3();

        if (name === 'sun') {
            planet.getWorldPosition(worldPosition);
        } else {
            // Get the actual world position of the planet mesh
            planet.mesh.getWorldPosition(worldPosition);
        }

        // Project the world position to screen coordinates
        const screenPosition = worldPosition.clone();
        const distance = camera.position.distanceTo(worldPosition);
        screenPosition.project(camera);

        if (screenPosition.z > 1) {
            planetLabels[name].style.display = 'none';
        } else {
            const x = (screenPosition.x * 0.5 + 0.5) * window.innerWidth;
            const y = (-screenPosition.y * 0.5 + 0.5) * window.innerHeight;

            planetLabels[name].style.display = 'block';
            planetLabels[name].style.transform = 'translate(-50%, -50%)';
            planetLabels[name].style.left = `${x}px`;
            planetLabels[name].style.top = `${y}px`;

            // Scale font size based on distance
            const baseSize = 12;
            const minSize = 8;
            const maxSize = 20;
            const scaleFactor = 500 / distance;
            const fontSize = Math.min(maxSize, Math.max(minSize, baseSize * scaleFactor));

            planetLabels[name].style.fontSize = `${fontSize}px`;
            const paddingScale = fontSize / baseSize;
            planetLabels[name].style.padding = `${2 * paddingScale}px ${6 * paddingScale}px`;
        }
    });

    // Update moon label
    if (moon) {
        const moonWorldPos = new THREE.Vector3();
        moon.getWorldPosition(moonWorldPos);
        const distance = camera.position.distanceTo(moonWorldPos);
        const screenPosition = moonWorldPos.clone().project(camera);

        if (screenPosition.z > 1) {
            planetLabels.moon.style.display = 'none';
        } else {
            const x = (screenPosition.x * 0.5 + 0.5) * window.innerWidth;
            const y = (-screenPosition.y * 0.5 + 0.5) * window.innerHeight;

            planetLabels.moon.style.display = 'block';
            planetLabels.moon.style.transform = 'translate(-50%, -50%)';
            planetLabels.moon.style.left = `${x}px`;
            planetLabels.moon.style.top = `${y}px`;

            const baseSize = 12;
            const minSize = 8;
            const maxSize = 20;
            const scaleFactor = 500 / distance;
            const fontSize = Math.min(maxSize, Math.max(minSize, baseSize * scaleFactor));

            planetLabels.moon.style.fontSize = `${fontSize}px`;
            const paddingScale = fontSize / baseSize;
            planetLabels.moon.style.padding = `${2 * paddingScale}px ${6 * paddingScale}px`;
        }
    }
}

function createMoon() {
    const earthData = PLANET_DATA.earth;
    const moonData = earthData.moon;

    const moonGeometry = new THREE.SphereGeometry(moonData.size, 32, 32);
    const moonMaterial = new THREE.MeshStandardMaterial({
        color: moonData.color,
        metalness: 0.3,
        roughness: 0.7,
        emissive: moonData.color,
        emissiveIntensity: moonData.glow
    });

    moon = new THREE.Mesh(moonGeometry, moonMaterial);
    moon.castShadow = true;
    moon.receiveShadow = true;

    moonHolder = new THREE.Object3D();
    planets.earth.mesh.add(moonHolder);
    moonHolder.add(moon);

    moon.position.x = moonData.distance;

    // Make moon's orbital path more visible
    const moonOrbitGeometry = new THREE.TorusGeometry(moonData.distance, 0.02, 16, 100);
    const moonOrbitMaterial = new THREE.MeshBasicMaterial({
        color: 0x888888,
        transparent: true,
        opacity: 0.5
    });
    const moonOrbit = new THREE.Mesh(moonOrbitGeometry, moonOrbitMaterial);
    moonOrbit.rotation.x = Math.PI / 2;
    planets.earth.mesh.add(moonOrbit);
}

function setupBloomEffect() {
    composer = new EffectComposer(renderer);
    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);

    const bloomPass = new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        CONFIG.rendering.bloomStrength,    // bloom strength
        CONFIG.rendering.bloomRadius,    // radius
        CONFIG.rendering.bloomThreshold    // threshold
    );
    composer.addPass(bloomPass);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);
    controls.update();

    // Update planets
    updatePlanets();

    // Update labels only if visible
    if (labelsVisible) {
        updateLabels();
    }

    // Track selected planet if tracking is active
    if (trackingPlanet && startTracking) {
        const targetObject = trackingPlanet === 'moon' ? moon : planets[trackingPlanet].mesh;
        const planetPosition = new THREE.Vector3();
        targetObject.getWorldPosition(planetPosition);

        // Calculate time since tracking started for smooth transition
        const trackingElapsed = performance.now() - trackingStartTime;
        const trackingTransitionDuration = 1000; // 1 second transition into tracking
        const trackingProgress = Math.min(trackingElapsed / trackingTransitionDuration, 1);

        // Smooth start for tracking
        const trackingEase = trackingProgress < 0.5
            ? 4 * trackingProgress * trackingProgress * trackingProgress
            : 1 - Math.pow(-2 * trackingProgress + 2, 3) / 2;

        // Update controls target to follow planet with smooth interpolation
        controls.target.lerp(planetPosition, 0.05 * trackingEase);

        // Calculate desired camera position
        const optimalDistance = targetObject.userData.optimalDistance;
        const elevationAngle = Math.PI / 6;
        const horizontalDistance = optimalDistance * Math.cos(elevationAngle);
        const verticalDistance = optimalDistance * Math.sin(elevationAngle);

        // Get current horizontal direction from camera to planet
        const currentDirection = new THREE.Vector3(
            camera.position.x - planetPosition.x,
            0,
            camera.position.z - planetPosition.z
        ).normalize();

        // Calculate desired camera position
        const desiredPosition = new THREE.Vector3(
            planetPosition.x + currentDirection.x * horizontalDistance,
            planetPosition.y + verticalDistance,
            planetPosition.z + currentDirection.z * horizontalDistance
        );

        // Smoothly interpolate camera position
        camera.position.lerp(desiredPosition, 0.05 * trackingEase);
    }

    composer.render();
}

function createInfoPanel() {
    infoPanel = document.createElement('div');
    infoPanel.id = 'info-panel';
    Object.assign(infoPanel.style, {
        position: 'absolute',
        right: '20px',
        top: '20px',
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        color: 'white',
        padding: '20px',
        borderRadius: '10px',
        fontFamily: 'Arial, sans-serif',
        width: '300px',
        display: 'none',
        zIndex: '1000',
        backdropFilter: 'blur(5px)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        transition: 'all 0.3s ease'
    });
    document.body.appendChild(infoPanel);
}

function setupClickDetection() {
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    window.addEventListener('click', (event) => {
        // Ignore clicks on UI elements
        if (event.target.closest('#info-panel') ||
            event.target.closest('button')) {
            return;
        }

        pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
        pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;

        raycaster.setFromCamera(pointer, camera);

        // Get all clickable objects
        const meshes = [];
        Object.entries(planets).forEach(([name, planet]) => {
            if (name === 'sun') {
                meshes.push(planet);
            } else if (planet.mesh) {
                meshes.push(planet.mesh);
                planet.mesh.children.forEach(child => {
                    if (child instanceof THREE.Mesh) {
                        meshes.push(child);
                    }
                });
            }
        });
        if (moon) meshes.push(moon);

        const intersects = raycaster.intersectObjects(meshes, true);

        if (intersects.length > 0) {
            const clickedObject = intersects[0].object;
            let planetName = '';

            // Determine which planet was clicked
            if (clickedObject === planets.sun) {
                planetName = 'sun';
            } else if (clickedObject === moon) {
                planetName = 'moon';
            } else {
                Object.entries(planets).forEach(([name, planet]) => {
                    if (planet.mesh === clickedObject ||
                        (planet.mesh && planet.mesh.children.includes(clickedObject))) {
                        planetName = name;
                    }
                });
            }

            if (planetName && PLANET_INFO[planetName]) {
                // Focus camera on planet
                focusOnPlanet(planetName);

                // Update info panel
                showPlanetInfo(planetName);
            }
        }
    });
}

function showPlanetInfo(planetName) {
    const info = PLANET_INFO[planetName];
    if (!info) return;

    selectedPlanet = planetName;

    infoPanel.innerHTML = `
        <button id="closeInfoPanel" style="position:absolute;right:10px;top:10px;border:none;background:none;color:white;font-size:24px;cursor:pointer;padding:5px;">×</button>
        <h2 style="margin-top:0;color:#FFD700;font-size:24px;margin-bottom:15px">
            ${planetName.charAt(0).toUpperCase() + planetName.slice(1)}
        </h2>
        <div style="margin-bottom:10px"><strong>Type:</strong> ${info.type}</div>
        <div style="margin-bottom:10px"><strong>Mass:</strong> ${info.mass}</div>
        <div style="margin-bottom:10px"><strong>Diameter:</strong> ${info.diameter}</div>
        <div style="margin-bottom:10px"><strong>Orbital Period:</strong> ${info.orbitalPeriod || 'N/A'}</div>
        <div style="margin-bottom:10px"><strong>Temperature:</strong> ${info.surfaceTemp}</div>
        <div style="margin-bottom:15px"><strong>Description:</strong><br>
            <p style="margin-top:5px">${info.description}</p>
        </div>
        <div style="background-color:rgba(255,215,0,0.1);padding:10px;border-radius:5px;margin-top:15px">
            <strong>Fun Fact:</strong><br>
            <p style="margin:5px 0 0 0">${info.funFact}</p>
        </div>
    `;

    document.getElementById('closeInfoPanel').addEventListener('click', () => {
        infoPanel.style.display = 'none';
        selectedPlanet = null;
        trackingPlanet = null;
        startTracking = false; // Reset tracking flag
    });

    infoPanel.style.display = 'block';
}

function focusOnPlanet(planetName) {
    if (!planets[planetName] && planetName !== 'moon') return;

    // Reset tracking flags
    startTracking = false;
    trackingPlanet = planetName;

    const targetObject = planetName === 'moon' ? moon : planets[planetName].mesh;
    const planetPosition = new THREE.Vector3();
    targetObject.getWorldPosition(planetPosition);

    // Calculate optimal camera distance based on planet size
    let size = planetName === 'sun' ? PLANET_DATA.sun.size : PLANET_DATA[planetName].size;
    let optimalDistance;

    // Adjust distances for better visibility
    if (planetName === 'sun') {
        optimalDistance = size * 6;
    } else if (size < 1) {
        optimalDistance = 8;
    } else if (planetName === 'saturn') {
        optimalDistance = size * 3;
    } else if (planetName === 'moon') {
        optimalDistance = 5;
    } else {
        optimalDistance = size * 4;
    }

    // Store the optimal distance for tracking
    targetObject.userData.optimalDistance = optimalDistance;

    // Add elevation for better viewing angle
    const elevationAngle = Math.PI / 6;
    const horizontalDistance = optimalDistance * Math.cos(elevationAngle);
    const verticalDistance = optimalDistance * Math.sin(elevationAngle);

    // Calculate new camera position
    const currentHorizontalDirection = new THREE.Vector3(
        camera.position.x - planetPosition.x,
        0,
        camera.position.z - planetPosition.z
    ).normalize();

    const newPosition = new THREE.Vector3(
        planetPosition.x + currentHorizontalDirection.x * horizontalDistance,
        planetPosition.y + verticalDistance,
        planetPosition.z + currentHorizontalDirection.z * horizontalDistance
    );

    // Animation setup
    const startPosition = camera.position.clone();
    const startTarget = controls.target.clone();
    const duration = 1500;
    const startTime = performance.now();

    // Animation function
    function animate(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Smoother easing function
        const easing = progress < 0.5
            ? 4 * progress * progress * progress
            : 1 - Math.pow(-2 * progress + 2, 3) / 2;

        camera.position.lerpVectors(startPosition, newPosition, easing);
        controls.target.lerpVectors(startTarget, planetPosition, easing);
        controls.update();

        if (progress < 1) {
            requestAnimationFrame(animate);
        } else {
            // After initial focus animation completes, set timer for tracking
            setTimeout(() => {
                startTracking = true;
                trackingStartTime = performance.now();
            }, 2000); // 3 second delay
        }
    }

    // Start animation
    requestAnimationFrame(animate);

    // Update controls
    controls.minDistance = 2;
    controls.maxDistance = 1000;
    controls.enableDamping = true;
    controls.dampingFactor = 0.1;
}

function createSpeedControls() {
    const controlPanel = document.createElement('div');
    Object.assign(controlPanel.style, {
        position: 'absolute',
        left: '20px',
        bottom: '20px',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        padding: '10px',
        borderRadius: '10px',
        display: 'flex',
        gap: '10px',
        alignItems: 'center',
        zIndex: '1000'
    });

    // Pause/Play button
    const pauseButton = document.createElement('button');
    Object.assign(pauseButton.style, {
        backgroundColor: '#444',
        color: 'white',
        border: 'none',
        padding: '8px 15px',
        borderRadius: '5px',
        cursor: 'pointer',
        fontFamily: 'Arial',
        transition: 'background-color 0.3s'
    });
    pauseButton.textContent = '⏸️ Pause';
    pauseButton.addEventListener('mouseover', () => pauseButton.style.backgroundColor = '#555');
    pauseButton.addEventListener('mouseout', () => pauseButton.style.backgroundColor = '#444');
    pauseButton.addEventListener('click', () => {
        isPaused = !isPaused;
        pauseButton.textContent = isPaused ? '▶️ Play' : '⏸️ Pause';
    });

    // Speed slider
    const speedControl = document.createElement('div');
    speedControl.style.display = 'flex';
    speedControl.style.alignItems = 'center';
    speedControl.style.gap = '10px';
    speedControl.style.color = 'white';
    speedControl.style.fontFamily = 'Arial';

    const slider = document.createElement('input');
    Object.assign(slider, {
        type: 'range',
        min: '0',
        max: '200',
        value: '100',
        step: '10'
    });
    Object.assign(slider.style, {
        width: '100px',
        cursor: 'pointer'
    });

    const speedLabel = document.createElement('span');
    speedLabel.textContent = '100%';

    slider.addEventListener('input', (e) => {
        animationSpeed = e.target.value / 100;
        speedLabel.textContent = `${e.target.value}%`;
    });

    speedControl.appendChild(document.createTextNode('Speed: '));
    speedControl.appendChild(slider);
    speedControl.appendChild(speedLabel);

    controlPanel.appendChild(pauseButton);
    controlPanel.appendChild(speedControl);
    document.body.appendChild(controlPanel);
}

// Initialize and start animation
init();
animate();