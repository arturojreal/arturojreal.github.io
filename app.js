import * as THREE from 'three';
import { PLYLoader } from 'three/addons/loaders/PLYLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';

import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// Three.js variables
let scene, camera, renderer, particleSystem, particles;
let originalPositions = [];
let velocities = [];
let targetPositions = [];
let mouse = new THREE.Vector2();
let raycaster = new THREE.Raycaster();
let mixer = null;
let solidModel = null; // Global solid model reference
let isLoading = false; // Prevent infinite loading loops
let composer, bloomPass;
let isWebGLSupported = true;
let reducedMotion = false;
let highContrast = false;

// Touch radius visualization
let touchRadiusIndicator = null;
let showTouchRadius = false; // Default to false (hidden)

// Create touch radius indicator
function createTouchRadiusIndicator() {
    const geometry = new THREE.RingGeometry(0.8, 1, 32); // Inner radius 0.8, outer radius 1
    const material = new THREE.MeshBasicMaterial({
        color: 0x00ff00, // Bright green for visibility
        transparent: true,
        opacity: 0.6,
        side: THREE.DoubleSide
    });
    touchRadiusIndicator = new THREE.Mesh(geometry, material);
    touchRadiusIndicator.visible = false;
    scene.add(touchRadiusIndicator);
    console.log('Touch radius indicator created');
}

// Update touch radius indicator
function updateTouchRadiusIndicator(mousePos, radius) {
    if (!touchRadiusIndicator) return;
    
    // Convert screen coordinates to world coordinates
    const vector = new THREE.Vector3(mousePos.x, mousePos.y, 0.5);
    vector.unproject(camera);
    const dir = vector.sub(camera.position).normalize();
    const distance = -camera.position.z / dir.z;
    const pos = camera.position.clone().add(dir.multiplyScalar(distance));
    
    touchRadiusIndicator.position.copy(pos);
    touchRadiusIndicator.scale.setScalar(radius);
    touchRadiusIndicator.lookAt(camera.position);
}

// Rotation control variables
let currentRotationY = 0;
let rotationDirection = 1;
const minRotationY = -Math.PI * 0.44;
let baseRotationSpeed = 0.005;
let easingZone = 0.15; // How close to limits before easing starts (0.0 to 1.0)

// Model-specific default parameters
const glbDefaults = {
    particleSize: 0.4,
    particleOpacity: 0.9,
    particleDensity: 42000,
    scaleFactor: 12,
    interactionRadius: 2.8,
    disperseForce: 0.15,
    rotationSpeed: 0.003,
    easingZone: 0.3,
    rotationMinDegrees: -10,
    rotationMaxDegrees: 30,
    bloomThreshold: 0.2,
    bloomStrength: 0.2,
    bloomRadius: 0.17,
    bloomEnabled: true,
    modelType: 'glb',
    modelRotationX: 0,
    modelRotationY: 0,
    modelRotationZ: 0,
    modelPositionX: 0.1,
    modelPositionY: 1.6,
    modelPositionZ: -10,
    // Separate 3D model controls
    solidModelScale: 1,
    solidModelPositionX: 0,
    solidModelPositionY: 0,
    solidModelPositionZ: 0,
    solidModelRotationX: 0,
    solidModelRotationY: 0,
    solidModelRotationZ: 0,
    customColor: '#ffffff',
    useCustomColor: false,
    particleEffectsEnabled: true,
    showAsParticles: true,
    showAs3DModel: false,
    // Tone mapping
    toneMappingExposure: 0.44,
    // Background color
    backgroundColor: '#0a0a0a',
    // Text colors
    primaryTextColor: '#fffffc',
    secondaryTextColor: '#cccccc',
    accentTextColor: '#d8aa5a',
    // Particle system (always enabled)
    // Particle controls
    particleColor: '#791630',
    particleForce: 0.58,
    particleMinAlpha: 0.04,
    particleMaxAlpha: 0.25,
    // Bloom direction
    bloomDirectionX: 0.97,
    bloomDirectionY: 0.18
};

const plyDefaults = {
    particleSize: 1.201,
    particleOpacity: 0.96,
    particleDensity: 85000,
    scaleFactor: 16.7,
    interactionRadius: 13.5,
    disperseForce: 1.38,
    rotationSpeed: 0.002,
    easingZone: 0.45,
    rotationMinDegrees: -10,
    rotationMaxDegrees: 30,
    bloomThreshold: 0.2,
    bloomStrength: 0.3,
    bloomRadius: 0.15,
    bloomEnabled: true,
    modelType: 'ply',
    modelRotationX: -65,
    modelRotationY: 0,
    modelRotationZ: 0,
    modelPositionX: 0.1,
    modelPositionY: 6.2,
    modelPositionZ: -3.2,
    // Separate 3D model controls
    solidModelScale: 1,
    solidModelPositionX: 0,
    solidModelPositionY: 0,
    solidModelPositionZ: 0,
    solidModelRotationX: 0,
    solidModelRotationY: 0,
    solidModelRotationZ: 0,
    customColor: '#d8aa5a',
    useCustomColor: true,
    particleEffectsEnabled: true,
    showAsParticles: true,
    showAs3DModel: false,
    // Tone mapping
    toneMappingExposure: 0.74,
    // Background color
    backgroundColor: '#0a0a0a',
    // Text colors
    primaryTextColor: '#fffffc',
    secondaryTextColor: '#cccccc',
    accentTextColor: '#d8aa5a',
    // Particle controls
    particleColor: '#d8aa5a',
    particleForce: 0.58,
    particleMinAlpha: 0.04,
    particleMaxAlpha: 0.25,
    // Bloom direction
    bloomDirectionX: 0.97,
    bloomDirectionY: 0.18
};

// Debug control variables - start with PLY defaults for ARTURO.ply as default
let debugParams = { ...plyDefaults };

// Model management system
let loadedModels = {
    glb: [
        { name: 'Default GLB (arturo_site.glb)', path: './models/arturo_site.glb', isDefault: true }
    ],
    ply: [
        { name: 'Default PLY (ARTURO.ply)', path: './ARTURO.ply', isDefault: true }
    ]
};
let currentModelIndex = { glb: 0, ply: 0 };
let loadedModelData = { glb: null, ply: null };

// Portfolio data
let portfolioData = {
  photography: [],
  film: [],
  vfx: []
};

// Load portfolio data from assets.json
async function loadPortfolioData() {
  try {
    const response = await fetch('./assets.json');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    portfolioData = data;
    console.log('Portfolio data loaded successfully:', portfolioData);
    return true;
  } catch (error) {
    console.error('Failed to load portfolio data:', error);
    // Keep the empty fallback data structure
    return false;
  }
}

// Lightbox functionality (fullscreen photo viewer)
let lightboxEl, lightboxImgEl, lightboxTitleEl, lightboxDescEl, lightboxInfoEl, lightboxCloseBtn, lightboxBackdrop;
let lightboxItems = [];
let currentLightboxIndex = -1;
let globalInfoExpanded = false;

function setupLightbox() {
  lightboxEl = document.getElementById('photo-lightbox');
  if (!lightboxEl) return;
  lightboxImgEl = document.getElementById('lightbox-img');
  lightboxTitleEl = document.getElementById('lightbox-title');
  lightboxDescEl = document.getElementById('lightbox-desc');
  lightboxInfoEl = document.getElementById('lightbox-info');
  lightboxCloseBtn = lightboxEl.querySelector('.lightbox__close');
  lightboxBackdrop = lightboxEl.querySelector('.lightbox__backdrop');

  if (lightboxCloseBtn) {
    lightboxCloseBtn.addEventListener('click', closeLightbox);
  }
  if (lightboxBackdrop) {
    lightboxBackdrop.addEventListener('click', closeLightbox);
  }
  document.addEventListener('keydown', (e) => {
    // If lightbox is open, handle its keys
    if (lightboxEl && !lightboxEl.classList.contains('hidden')) {
      if (e.key === 'Escape') {
        closeLightbox();
      } else if (e.key === 'ArrowRight') {
        navigateLightbox(1);
      } else if (e.key === 'ArrowLeft') {
        navigateLightbox(-1);
      }
      return;
    }

    // Global toggle for info panels across the active page
    if ((e.key === 'i' || e.key === 'I') && !e.ctrlKey && !e.metaKey && !e.altKey) {
      toggleAllItemInfos();
    }
  });
}

function showLightboxAt(index) {
  if (!lightboxEl || !lightboxItems.length) return;
  const item = lightboxItems[(index + lightboxItems.length) % lightboxItems.length];
  currentLightboxIndex = (index + lightboxItems.length) % lightboxItems.length;
  lightboxImgEl.src = item.src;
  lightboxImgEl.alt = item.title || 'Expanded photo';
  lightboxTitleEl.textContent = item.title || '';
  lightboxDescEl.textContent = item.description || '';
}

function openLightbox({ index = 0, src, title, description }) {
  if (!lightboxEl) return;
  // If index supplied, prefer global items; else show this single item
  if (typeof index === 'number' && lightboxItems.length) {
    showLightboxAt(index);
  } else {
    lightboxItems = [{ src, title, description }];
    showLightboxAt(0);
  }
  lightboxEl.classList.remove('hidden');
  // Prevent background scroll
  document.body.style.overflow = 'hidden';
}

function navigateLightbox(delta) {
  if (!lightboxItems.length) return;
  showLightboxAt(currentLightboxIndex + delta);
}

function toggleAllItemInfos(hide) {
  const items = Array.from(document.querySelectorAll('.portfolio-item'));
  if (!items.length) return;
  const shouldHide = typeof hide === 'boolean'
    ? hide
    : !items.some(el => el.classList.contains('info-hidden'));
  items.forEach(el => el.classList.toggle('info-hidden', shouldHide));
  globalInfoExpanded = !shouldHide;
}

function closeLightbox() {
  if (!lightboxEl) return;
  lightboxEl.classList.add('hidden');
  // Restore background scroll
  document.body.style.overflow = '';
}
// Initialize the application
document.addEventListener('DOMContentLoaded', async function() {
    console.log('Portfolio app initialized');
    
    // Initialize Three.js scene first
    initializeThreeJS();
    
    // Wait a moment for Three.js to fully initialize
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Initialize enhanced model system after Three.js is ready
    initializeEnhancedModelSystem();
    
    // Initialize debug panel
    initializeDebugPanel();
    
    // Initialize text colors
    updateTextColors();
    
    // Initialize tone mapping
    updateToneMappingExposure();
    
    // Initialize page navigation
    initializeNavigation();
    
    // Initialize mobile connect functionality
    initializeMobileConnect();
    
    // Load portfolio data
    const dataLoaded = await loadPortfolioData();
  
    initializeAccessibility();
    
    // Generate portfolio content after data is loaded
    if (dataLoaded) {
        generatePortfolioContent();
    } else {
        console.warn('Portfolio content not generated due to data loading failure');
    }
    
    // Hide loading screen immediately after initialization
    hideLoadingScreen();
});

// Loading Screen Management
function hideLoadingScreen() {
    console.log('hideLoadingScreen called');
    
    // Try multiple approaches to find and remove loading elements
    const loadingScreen = document.getElementById('loading-screen');
    const loadingElements = document.querySelectorAll('.loading-screen, [id*="loading"], [class*="loading"]');
    
    console.log('Found loading screen by ID:', loadingScreen);
    console.log('Found loading elements by selector:', loadingElements.length);
    
    if (loadingScreen) {
        console.log('Removing loading screen by ID...');
        loadingScreen.remove();
        console.log('Loading screen removed from DOM');
    }
    
    // Remove any other loading-related elements
    loadingElements.forEach((element, index) => {
        console.log(`Removing loading element ${index}:`, element);
        element.remove();
    });
    
    // Double-check - try to find any remaining elements
    setTimeout(() => {
        const remaining = document.querySelectorAll('.loading-screen, [id*="loading"], [class*="loading"]');
        console.log('Remaining loading elements after cleanup:', remaining.length);
        if (remaining.length > 0) {
            console.warn('Still found loading elements:', remaining);
        }
        
        // Also check for any elements containing "One moment please"
        const textElements = document.querySelectorAll('*');
        let foundText = false;
        textElements.forEach(el => {
            if (el.textContent && el.textContent.includes('One moment please')) {
                console.warn('Found element with "One moment please" text:', el);
                el.remove();
                foundText = true;
            }
        });
        
        if (foundText) {
            console.log('Removed elements containing "One moment please" text');
        } else {
            console.log('No elements found containing "One moment please" text');
        }
    }, 100);
}

// Accessibility Functions
function initializeAccessibility() {
    const contrastToggle = document.getElementById('contrast-toggle');
    const motionToggle = document.getElementById('motion-toggle');
    
    if (contrastToggle) {
        contrastToggle.addEventListener('click', function() {
            const currentScheme = document.documentElement.getAttribute('data-color-scheme') || 'dark';
            const newScheme = currentScheme === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-color-scheme', newScheme);
            this.setAttribute('aria-pressed', newScheme === 'light');
            this.textContent = newScheme === 'dark' ? '🌙' : '☀️';
        });
    }
    
    if (motionToggle) {
        motionToggle.addEventListener('click', function() {
            reducedMotion = !reducedMotion;
            document.documentElement.setAttribute('data-reduced-motion', reducedMotion);
            this.setAttribute('aria-pressed', reducedMotion);
        });
    }
    
    // Check for prefers-reduced-motion
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        reducedMotion = true;
        document.documentElement.setAttribute('data-reduced-motion', true);
        if (motionToggle) {
            motionToggle.setAttribute('aria-pressed', 'true');
        }
    }
    
    // Keyboard navigation
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            navigateToHome();
        }
    });
}

// Navigation Functions
function initializeNavigation() {
    console.log('Initializing navigation...');
    
    // Main navigation buttons
    const navButtons = document.querySelectorAll('.nav-btn');
    console.log('Found nav buttons:', navButtons.length);
    
    navButtons.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            const page = this.getAttribute('data-page');
            console.log('Navigating to page:', page);
            navigateToPage(page);
        });
    });
    
    // Back buttons
    const backButtons = document.querySelectorAll('.back-btn');
    console.log('Found back buttons:', backButtons.length);
    
    backButtons.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('Navigating back to home');
            navigateToHome();
        });
    });
}

function navigateToPage(pageId) {
    console.log('Navigating to:', pageId);
    
    // Hide all pages
    const allPages = document.querySelectorAll('.page');
    allPages.forEach(page => {
        page.classList.remove('active');
        page.classList.add('hidden');
    });
    
    // Show target page
    const targetPage = document.getElementById(pageId + '-page');
    console.log('Target page element:', targetPage);
    
    if (targetPage) {
        targetPage.classList.remove('hidden');
        targetPage.classList.add('active');
        
        // Update page title
        document.title = `Arturo J. Real - ${pageId.charAt(0).toUpperCase() + pageId.slice(1)} Portfolio`;
        
        // Focus management for accessibility
        const pageHeader = targetPage.querySelector('h1');
        if (pageHeader) {
            pageHeader.focus();
        }
        
        console.log('Successfully navigated to:', pageId);
    } else {
        console.error('Target page not found:', pageId + '-page');
    }
}

function navigateToHome() {
    console.log('Navigating to home');
    
    const allPages = document.querySelectorAll('.page');
    allPages.forEach(page => {
        page.classList.remove('active');
    });
    
    const homePage = document.getElementById('home-page');
    if (homePage) {
        homePage.classList.add('active');
        document.title = 'Arturo J. Real - WebXR & Three.js Portfolio';
        
        // Focus on main name for accessibility
        const mainName = document.getElementById('main-name');
        if (mainName) {
            mainName.focus();
        }
    }
}

// Portfolio Content Generation
function generatePortfolioContent() {
    console.log('Generating portfolio content...');
    generatePhotographyContent();
    generateFilmContent();
    generateVFXContent();
    generateAboutContent();
}

function generatePhotographyContent() {
    const grid = document.querySelector('#photography-page .portfolio-grid');
    console.log('Photography grid found:', !!grid);
    
    if (!grid) return;
    
    const items = portfolioData.photography || [];
    console.log('Photography items:', items.length);
    
    // Build lightbox item list for keyboard navigation
    lightboxItems = items.map((item) => ({
        src: item.image,
        title: item.title,
        description: item.description
    }));

    items.forEach((item, index) => {
        const portfolioItem = document.createElement('div');
        portfolioItem.className = 'portfolio-item';
        portfolioItem.setAttribute('role', 'listitem');
        portfolioItem.setAttribute('tabindex', '0');

        const infoId = `photo-info-${index}`;

        portfolioItem.innerHTML = `
            <div class="item-content">
                <img class="photo-img" src="${item.image}" alt="${item.title}" loading="lazy" />
            </div>
            <div class="item-info" id="${infoId}">
                <h3 class="item-title">${item.title}</h3>
                <p class="item-description">${item.description}</p>
            </div>
        `;

        // Wire up interactions after insertion
        const img = portfolioItem.querySelector('.photo-img');

        if (img) {
            img.addEventListener('click', () => {
                openLightbox({ index });
            });
        }

        /* COMMENTED OUT - Info button functionality (saved for future use)
        const infoBtn = portfolioItem.querySelector('.info-toggle');
        const infoPanel = portfolioItem.querySelector('.item-info');
        
        if (infoBtn && infoPanel) {
            infoBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                toggleAllItemInfos(!globalInfoExpanded);
            });
        }
        */

        grid.appendChild(portfolioItem);
    });
    
    console.log('Generated', items.length, 'photography items with images');
    // Info is visible by default, no need to toggle
}

// About Page
function generateAboutContent() {
    const aboutWrapper = document.querySelector('#about-page .about-wrapper');
    if (!aboutWrapper) return;
    
    // Clear existing content
    aboutWrapper.innerHTML = '';
    
    // Create single centered image
    const aboutImage = document.createElement('div');
    aboutImage.className = 'about-image';
    aboutImage.innerHTML = `<img src="images/art1.webp" alt="About Arturo J. Real" loading="lazy" />`;
    
    // Create text content
    const aboutText = document.createElement('article');
    aboutText.className = 'about-text';
    aboutText.setAttribute('aria-label', 'About Me');
    aboutText.innerHTML = `
        <p>Arturo J. Real is an artist. He was born and raised in Venezuela, and lives in the moment.</p>
        <p>When there's not a camera in his hands, he prefers an instrument or a Nutella croissant as a temporary replacement.</p>
        <p>He's the worst at speaking in the third person and so I'll switch it up and thank you for visiting this About page!</p>
        <p>In May 2021, I wrapped up my fourth year working as a Technologist in Production at CS50. CS50 is an on-campus and online introductory course on computer science taught at Harvard University, Yale University, and hundreds of cities around the world.</p>
        <p>I took CS50 at The Idea Center in Miami, Florida while I was in college. After graduating, I worked there for several years helping students learn programming and computer science fundamentals.</p>
    `;
    
    // Append to wrapper
    aboutWrapper.appendChild(aboutImage);
    aboutWrapper.appendChild(aboutText);
}

function generateFilmContent() {
    const grid = document.querySelector('#film-page .portfolio-grid');
    console.log('Film grid found:', !!grid);
    
    if (!grid) return;
    
    const items = portfolioData.film || [];
    console.log('Film items:', items.length);
    
    items.forEach((item, index) => {
        const portfolioItem = document.createElement('div');
        portfolioItem.className = 'portfolio-item';
        portfolioItem.setAttribute('role', 'listitem');
        portfolioItem.setAttribute('tabindex', '0');
        
        portfolioItem.innerHTML = `
            <div class="item-content">
                ${item.thumbnail ? `<img src="${item.thumbnail}" alt="${item.title}" loading="lazy" />` : '<div class="placeholder-video">▶️</div>'}
                <div class="item-duration">${item.duration || ''}</div>
            </div>
            <div class="item-info">
                <h3 class="item-title">${item.title}</h3>
                <p class="item-description">${item.description}</p>
            </div>
        `;
        
        grid.appendChild(portfolioItem);
    });
    
    console.log('Generated', items.length, 'film items');
    // Info is visible by default, no need to toggle
}

function generateVFXContent() {
    const grid = document.querySelector('#vfx-page .portfolio-grid');
    console.log('VFX grid found:', !!grid);
    
    if (!grid) return;
    
    const items = portfolioData.vfx || [];
    console.log('VFX items:', items.length);
    
    items.forEach((item, index) => {
        const portfolioItem = document.createElement('div');
        portfolioItem.className = 'portfolio-item';
        portfolioItem.setAttribute('role', 'listitem');
        portfolioItem.setAttribute('tabindex', '0');
        
        const canvasId = `vfx-canvas-${index}`;
        
        portfolioItem.innerHTML = `
            <div class="item-content">
                <canvas id="${canvasId}" class="vfx-canvas"></canvas>
            </div>
            <div class="item-info">
                <h3 class="item-title">${item.title}</h3>
                <p class="item-description">${item.description}</p>
            </div>
        `;
        
        grid.appendChild(portfolioItem);
        
        // Initialize 3D content for each VFX item after a short delay
        setTimeout(() => initializeVFXCanvas(canvasId, index), 500);
    });
    
    console.log('Generated', items.length, 'VFX items');
    // Info is visible by default, no need to toggle
}

// Three.js Initialization
function initializeThreeJS() {
    try {
        console.log('Initializing Three.js...');
        const canvas = document.getElementById('three-canvas');
        const container = document.getElementById('canvas-container');
        
        if (!canvas || !container) {
            console.error('Canvas or container not found');
            return;
        }
        
        // Scene setup
        scene = new THREE.Scene();
        camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        
        // Renderer setup with WebGL support check
        renderer = new THREE.WebGLRenderer({ 
            canvas: canvas, 
            antialias: true, 
            alpha: true 
        });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        // Set initial background color from debug params
        const initialColor = new THREE.Color(debugParams.backgroundColor);
        renderer.setClearColor(initialColor, 1);
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        
        // Set tone mapping
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = debugParams.toneMappingExposure;
        
        // Setup post-processing
        setupPostProcessing();
        
        // Create touch radius indicator
        createTouchRadiusIndicator();
        
        // Mouse and raycaster for interaction
        mouse = new THREE.Vector2();
        raycaster = new THREE.Raycaster();
        
        // Initialize enhanced model system instead of old loadModel()
        // loadModel(); // Disabled - using enhanced system now
        
        // Camera position - move back further to see the full model
        camera.position.z = 15;
        camera.position.y = 2;
        
        // Event listeners
        window.addEventListener('resize', onWindowResize);
        container.addEventListener('mousemove', onMouseMove);
        container.addEventListener('touchmove', onTouchMove);
        container.addEventListener('mouseenter', () => {
            if (touchRadiusIndicator && showTouchRadius) touchRadiusIndicator.visible = true;
        });
        container.addEventListener('mouseleave', () => {
            if (touchRadiusIndicator) touchRadiusIndicator.visible = false;
        });
        container.addEventListener('touchend', () => {
            if (touchRadiusIndicator) touchRadiusIndicator.visible = false;
        });
        
        // Start render loop
        animate();
        
        console.log('Three.js initialized successfully');
        
    } catch (error) {
        console.error('WebGL initialization failed:', error);
        handleWebGLError();
    }
}

function loadModel() {
    if (isLoading) {
        console.log('Model loading already in progress, skipping...');
        return;
    }
    
    console.log('Starting model load, type:', debugParams.modelType);
    isLoading = true;
    if (debugParams.modelType === 'glb') {
        loadGLBModel();
    } else {
        loadPLYPointCloud();
    }
}

function loadGLBModel(modelPath = null) {
    const loader = new GLTFLoader();
    const currentModel = loadedModels.glb[currentModelIndex.glb];
    const pathToLoad = modelPath || currentModel.path;
    
    loader.load(
        pathToLoad,
        function (gltf) {
            console.log('GLB model loaded successfully:', pathToLoad);
            gltfModel = gltf.scene;
            loadedModelData.glb = gltf;
            
            // Add lighting
            const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
            scene.add(ambientLight);
            
            const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
            directionalLight.position.set(1, 1, 1);
            scene.add(directionalLight);
            
            // Show particles and/or solid model based on settings
            if (debugParams.showAsParticles) {
                createParticlesFromGLB(gltf);
            }
            if (debugParams.showAs3DModel) {
                displaySolidModel(gltf.scene);
            }
        },
        function (progress) {
            console.log('GLB loading progress:', (progress.loaded / progress.total * 100) + '%');
        },
        function (error) {
            console.error('Error loading GLB file:', error);
            console.log('Falling back to PLY model...');
            loadPLYPointCloud();
        }
    );
}

function createParticlesFromGLB(gltf) {
    const positions = [];
    const colors = [];
    
    // Create rotation matrix for model orientation
    const rotationMatrix = new THREE.Matrix4();
    rotationMatrix.makeRotationFromEuler(new THREE.Euler(
        THREE.MathUtils.degToRad(debugParams.modelRotationX),
        THREE.MathUtils.degToRad(debugParams.modelRotationY),
        THREE.MathUtils.degToRad(debugParams.modelRotationZ)
    ));
    
    // Traverse the GLB scene to extract vertex positions
    gltf.scene.traverse((child) => {
        if (child.isMesh && child.geometry) {
            const geometry = child.geometry;
            const positionAttribute = geometry.attributes.position;
            
            if (positionAttribute) {
                // Get the world matrix for this mesh
                child.updateMatrixWorld();
                const worldMatrix = child.matrixWorld;
                
                // Extract positions and apply world transform + rotation
                for (let i = 0; i < positionAttribute.count; i++) {
                    const vertex = new THREE.Vector3();
                    vertex.fromBufferAttribute(positionAttribute, i);
                    vertex.applyMatrix4(worldMatrix);
                    vertex.applyMatrix4(rotationMatrix); // Apply model rotation
                    
                    positions.push(vertex.x, vertex.y, vertex.z);
                    
                    // Use vertex colors if available, otherwise use height-based gradient
                    if (geometry.attributes.color) {
                        const color = new THREE.Color();
                        color.fromBufferAttribute(geometry.attributes.color, i);
                        colors.push(color.r, color.g, color.b);
                    } else {
                        // Height-based color gradient
                        const normalizedHeight = (vertex.y + 2) / 4; // Adjust range as needed
                        const color = new THREE.Color().setHSL(0.6 - normalizedHeight * 0.3, 0.8, 0.5);
                        colors.push(color.r, color.g, color.b);
                    }
                }
            }
        }
    });
    
    console.log(`Extracted ${positions.length / 3} vertices from GLB model`);
    
    // Apply density sampling if needed
    let sampledPositions = positions;
    let sampledColors = colors;
    
    const totalVertices = positions.length / 3;
    if (totalVertices > debugParams.particleDensity) {
        const step = Math.floor(totalVertices / debugParams.particleDensity);
        sampledPositions = [];
        sampledColors = [];
        
        for (let i = 0; i < positions.length; i += step * 3) {
            sampledPositions.push(positions[i], positions[i + 1], positions[i + 2]);
            sampledColors.push(colors[i], colors[i + 1], colors[i + 2]);
        }
    }
    
    createParticleSystem(sampledPositions, sampledColors);
}

function createParticleSystem(positions, colors) {
    // Apply scale factor to positions
    const scaledPositions = new Float32Array(positions.length);
    for (let i = 0; i < positions.length; i += 3) {
        scaledPositions[i] = positions[i] * debugParams.scaleFactor;
        scaledPositions[i + 1] = positions[i + 1] * debugParams.scaleFactor;
        scaledPositions[i + 2] = positions[i + 2] * debugParams.scaleFactor;
    }
    
    // Create geometry
    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(scaledPositions, 3));
    
    // Handle colors - create default colors if none provided or use custom color override
    let colorArray;
    if (debugParams.useCustomColor) {
        // Use custom color for all particles
        const customColor = new THREE.Color(debugParams.customColor);
        colorArray = new Float32Array(positions.length);
        for (let i = 0; i < positions.length; i += 3) {
            colorArray[i] = customColor.r;
            colorArray[i + 1] = customColor.g;
            colorArray[i + 2] = customColor.b;
        }
    } else if (colors && colors.length > 0) {
        colorArray = new Float32Array(colors);
    } else {
        // Generate height-based gradient colors
        colorArray = new Float32Array(positions.length);
        for (let i = 0; i < positions.length; i += 3) {
            const y = positions[i + 1];
            const normalizedHeight = (y + 2) / 4; // Adjust range as needed
            const color = new THREE.Color().setHSL(0.6 - normalizedHeight * 0.3, 0.8, 0.5);
            colorArray[i] = color.r;
            colorArray[i + 1] = color.g;
            colorArray[i + 2] = color.b;
        }
    }
    
    particleGeometry.setAttribute('color', new THREE.BufferAttribute(colorArray, 3));
    
    // Create material with dreamy particle settings
    const opacity = debugParams.particleMaxAlpha;
        
    const particleMaterial = new THREE.PointsMaterial({
        size: debugParams.particleSize,
        vertexColors: true,
        transparent: true,
        opacity: opacity,
        blending: THREE.AdditiveBlending,
        sizeAttenuation: false,
        depthWrite: false,
        depthTest: false
    });
    
    // Enhanced material properties (always enabled)
    particleMaterial.alphaTest = debugParams.particleMinAlpha;
    
    // Clean up existing particle system
    if (particleSystem) {
        scene.remove(particleSystem);
        if (particleSystem.geometry) {
            particleSystem.geometry.dispose();
        }
        if (particleSystem.material) {
            particleSystem.material.dispose();
        }
        particleSystem = null;
        particles = null;
    }
    
    // Create new particle system
    particleSystem = new THREE.Points(particleGeometry, particleMaterial);
    particleSystem.position.set(
        debugParams.modelPositionX || 0, 
        debugParams.modelPositionY || 0, 
        debugParams.modelPositionZ || 0
    );
    
    // Enable bloom layer for dreamy particles effect
    particleSystem.layers.enable(1);
    
    scene.add(particleSystem);
    
    // Store reference to particles for interaction
    particles = particleSystem.geometry.attributes.position;
    console.log('Particles reference updated:', !!particles, 'Array length:', particles?.array?.length);    
    // Initialize interaction arrays with scaled positions
    const particleCount = scaledPositions.length;
    originalPositions = [...scaledPositions];
    targetPositions = [...scaledPositions];
    velocities = new Array(particleCount).fill(0);
    
    console.log(`Created particle system with ${particleCount / 3} particles`);
    console.log('Particle system position:', particleSystem.position.x, particleSystem.position.y, particleSystem.position.z);
    console.log('Particle system scale:', particleSystem.scale.x, particleSystem.scale.y, particleSystem.scale.z);
    console.log('Camera position:', camera.position.x, camera.position.y, camera.position.z);
    console.log('Particle material size:', debugParams.particleSize);
    console.log('Particle material opacity:', debugParams.particleOpacity);
    console.log('Scale factor:', debugParams.scaleFactor);
    console.log('Particle system visible:', particleSystem.visible);
    console.log('Scene children count:', scene.children.length);
    console.log('Particle geometry positions count:', particleSystem.geometry.attributes.position.count);
    console.log('First few particle positions:', 
        particleSystem.geometry.attributes.position.array.slice(0, 9));
    
    // Reset loading flag
    setTimeout(function() {
        isLoading = false;
        console.log('Loading flag reset, ready for next operation');
    }, 1000); // Give a 1 second buffer to prevent immediate reloads
}

function displaySolidModel(model) {
    // Clean up existing solid model
    if (solidModel) {
        scene.remove(solidModel);
    }
    
    // Clone the model to avoid modifying the original
    solidModel = model.clone();
    
    // Apply transformations
    solidModel.scale.set(debugParams.scaleFactor, debugParams.scaleFactor, debugParams.scaleFactor);
    solidModel.position.set(
        debugParams.modelPositionX || 0,
        debugParams.modelPositionY || 0,
        debugParams.modelPositionZ || 0
    );
    
    // Apply rotations
    solidModel.rotation.x = (debugParams.modelRotationX * Math.PI) / 180;
    solidModel.rotation.y = (debugParams.modelRotationY * Math.PI) / 180;
    solidModel.rotation.z = (debugParams.modelRotationZ * Math.PI) / 180;
    
    // Apply custom color if enabled
    if (debugParams.useCustomColor) {
        const customColor = new THREE.Color(debugParams.customColor);
        solidModel.traverse((child) => {
            if (child.isMesh) {
                child.material = child.material.clone();
                child.material.color = customColor;
            }
        });
    }
    
    scene.add(solidModel);
    console.log('Displaying solid model');
}

// PRESERVED PLY LOADING CODE - Currently commented out but fully functional
function loadPLYPointCloud(modelPath = null) {
    const loader = new PLYLoader();
    const currentModel = loadedModels.ply[currentModelIndex.ply];
    const pathToLoad = modelPath || currentModel.path;
    
    console.log('Loading PLY model:', pathToLoad);
    console.log('Current PLY model index:', currentModelIndex.ply);
    console.log('Current PLY model:', currentModel);
    
    loader.load(
        pathToLoad,
        function (geometry) {
            console.log('PLY point cloud loaded successfully:', pathToLoad);
            console.log('Point count:', geometry.attributes.position?.count);
            loadedModelData.ply = geometry;
            
            // Lighting setup
            const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
            scene.add(ambientLight);
            
            const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
            directionalLight.position.set(1, 1, 1);
            scene.add(directionalLight);
            
            createParticlesFromPLY(geometry);
        },
        function (progress) {
            if (progress.lengthComputable) {
                const percentComplete = (progress.loaded / progress.total) * 100;
                console.log('PLY loading progress:', percentComplete + '%');
            }
        },
        function (error) {
            console.error('Error loading PLY file:', error);
            console.error('Failed path:', pathToLoad);
            console.error('Error details:', error.message || error);
            // Fallback to creating basic particles
            createFallbackParticles();
            // Reset loading flag on error
            isLoading = false;
        }
    );
}

function createFallbackParticles() {
    console.log('Creating fallback particle system');
    const particleCount = 1000;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    
    // Reset interaction arrays
    originalPositions = [];
    targetPositions = [];
    velocities = [];
    
    for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;
        
        // Create humanoid shape
        let x, y, z;
        if (i < 200) {
            // Head
            const angle = (i / 200) * Math.PI * 2;
            const radius = 0.3 + Math.random() * 0.2;
            x = Math.cos(angle) * radius;
            y = 1.5 + Math.sin(angle) * radius;
            z = (Math.random() - 0.5) * 0.3;
        } else if (i < 600) {
            // Torso
            x = (Math.random() - 0.5) * 0.8;
            y = 0.3 + Math.random() * 1.0;
            z = (Math.random() - 0.5) * 0.4;
        } else {
            // Limbs
            const side = Math.random() > 0.5 ? 1 : -1;
            x = side * (0.3 + Math.random() * 0.6);
            y = -0.5 + Math.random() * 1.5;
            z = (Math.random() - 0.5) * 0.3;
        }
        
        positions[i3] = x;
        positions[i3 + 1] = y;
        positions[i3 + 2] = z;
        
        // Store for interaction
        originalPositions.push(x, y, z);
        targetPositions.push(x, y, z);
        velocities.push(0, 0, 0);
        
        // Color
        colors[i3] = 0.4 + Math.random() * 0.4;
        colors[i3 + 1] = 0.5 + Math.random() * 0.3;
        colors[i3 + 2] = 0.8 + Math.random() * 0.2;
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    const material = new THREE.PointsMaterial({
        size: 0.06,
        vertexColors: true,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending
    });
    
    particleSystem = new THREE.Points(geometry, material);
    particleSystem.position.set(0, 0.5, 0);
    scene.add(particleSystem);
    particles = particleSystem.geometry.attributes.position;
    console.log('Particles reference updated:', !!particles, 'Array length:', particles?.array?.length);    
    console.log('Fallback particle system created with', particleCount, 'particles');
}

function createParticlesFromPLY(geometry) {
    const positions = geometry.attributes.position.array;
    const colors = geometry.attributes.color ? geometry.attributes.color.array : null;
    
    console.log(`Processing ${positions.length / 3} vertices from PLY`);
    
    // Apply rotation to PLY positions to fix Blender Y-up orientation
    const rotatedPositions = [];
    const rotationMatrix = new THREE.Matrix4();
    rotationMatrix.makeRotationFromEuler(new THREE.Euler(
        THREE.MathUtils.degToRad(debugParams.modelRotationX),
        THREE.MathUtils.degToRad(debugParams.modelRotationY),
        THREE.MathUtils.degToRad(debugParams.modelRotationZ)
    ));
    
    for (let i = 0; i < positions.length; i += 3) {
        const vertex = new THREE.Vector3(positions[i], positions[i + 1], positions[i + 2]);
        vertex.applyMatrix4(rotationMatrix);
        rotatedPositions.push(vertex.x, vertex.y, vertex.z);
    }
    
    createParticleSystem(rotatedPositions, colors);
}

// Debug Panel Functions
function initializeDebugPanel() {
    const debugPanel = document.getElementById('particle-debug');
    const debugClose = document.getElementById('debug-close');
    const exportBtn = document.getElementById('export-params');
    const resetBtn = document.getElementById('reset-params');
    const clearBtn = document.getElementById('clear-models');
    
    // D key toggle functionality - hidden by default
    document.addEventListener('keydown', function(event) {
        if (event.key.toLowerCase() === 'd' && !event.ctrlKey && !event.metaKey && !event.altKey) {
            // Only toggle if not in an input field
            if (!event.target.matches('input, textarea, select')) {
                event.preventDefault();
                debugPanel.classList.toggle('hidden');
            }
        }
    });
    
    // Triple tap support for mobile debug panel access
    let tapCount = 0;
    let tapTimer = null;
    
    document.addEventListener('touchend', function(event) {
        tapCount++;
        
        if (tapCount === 1) {
            tapTimer = setTimeout(() => {
                tapCount = 0;
            }, 500); // Reset after 500ms
        } else if (tapCount === 3) {
            clearTimeout(tapTimer);
            tapCount = 0;
            
            // On mobile, replace social links with debug panel
            const mobileNav = document.querySelector('.mobile-nav');
            const mobileSocialContainer = document.querySelector('.mobile-social-container');
            const isDebugVisible = !debugPanel.classList.contains('hidden');
            
            if (isDebugVisible) {
                // Hide debug panel, show social links
                debugPanel.classList.add('hidden');
                if (mobileNav) mobileNav.style.display = 'flex';
                if (mobileSocialContainer) mobileSocialContainer.style.display = 'flex';
                console.log('Debug panel hidden, social links restored');
            } else {
                // Show debug panel, hide social links
                debugPanel.classList.remove('hidden');
                debugPanel.style.display = 'block'; // Force display on mobile
                if (mobileNav) mobileNav.style.display = 'none';
                if (mobileSocialContainer) mobileSocialContainer.style.display = 'none';
                console.log('Debug panel shown, social links hidden', {
                    panelClasses: debugPanel.className,
                    panelDisplay: debugPanel.style.display,
                    panelVisible: !debugPanel.classList.contains('hidden')
                });
            }
        }
    });
    
    if (debugClose) {
        debugClose.addEventListener('click', function() {
            debugPanel.classList.add('hidden');
        });
    }
    
    // Debug panel minimize/maximize functionality
    const minimizeBtn = document.getElementById('debug-minimize');
    if (minimizeBtn) {
        minimizeBtn.addEventListener('click', function() {
            const debugContent = debugPanel.querySelector('.debug-content');
            
            if (debugContent.style.display === 'none') {
                // Restore
                debugContent.style.display = 'block';
                minimizeBtn.textContent = '−';
                debugPanel.style.height = 'auto';
            } else {
                // Minimize
                debugContent.style.display = 'none';
                minimizeBtn.textContent = '+';
                debugPanel.style.height = 'auto';
            }
        });
    }
    
    // Initialize essential sliders with enhanced parameter tracking
    initializeSliderWithNumber('particle-size', 'particleSize', function() {
        if (activeModelInstance) activeModelInstance.updateParam('particleSize', debugParams.particleSize);
        updateParticleSize();
    });
    initializeSliderWithNumber('particle-opacity', 'particleOpacity', function() {
        if (activeModelInstance) activeModelInstance.updateParam('particleOpacity', debugParams.particleOpacity);
        updateParticleOpacity();
    });
    initializeSliderWithNumber('particle-density', 'particleDensity', function() {
        if (activeModelInstance) activeModelInstance.updateParam('particleDensity', debugParams.particleDensity);
        reloadParticles();
    });
    initializeSliderWithNumber('scale-factor', 'scaleFactor', function() {
        if (activeModelInstance) activeModelInstance.updateParam('scaleFactor', debugParams.scaleFactor);
        reloadParticles();
    });
    initializeSliderWithNumber('interaction-radius', 'interactionRadius', function() {
        if (activeModelInstance) activeModelInstance.updateParam('interactionRadius', debugParams.interactionRadius);
    });
    initializeSliderWithNumber('disperse-force', 'disperseForce', function() {
        if (activeModelInstance) activeModelInstance.updateParam('disperseForce', debugParams.disperseForce);
    });
    initializeSliderWithNumber('rotation-speed', 'rotationSpeed', function() {
        if (activeModelInstance) activeModelInstance.updateParam('rotationSpeed', debugParams.rotationSpeed);
    });
    initializeSliderWithNumber('easing-zone', 'easingZone', function() {
        if (activeModelInstance) activeModelInstance.updateParam('easingZone', debugParams.easingZone);
    });
    
    // Enhanced 3D model controls
    initializeSliderWithNumber('solid-model-scale', 'solidModelScale', function() {
        if (activeModelInstance) activeModelInstance.updateParam('solidModelScale', debugParams.solidModelScale);
        updateSolidModelTransform();
    });
    initializeSliderWithNumber('solid-model-position-x', 'solidModelPositionX', function() {
        if (activeModelInstance) activeModelInstance.updateParam('solidModelPositionX', debugParams.solidModelPositionX);
        updateSolidModelTransform();
    });
    initializeSliderWithNumber('solid-model-position-y', 'solidModelPositionY', function() {
        if (activeModelInstance) activeModelInstance.updateParam('solidModelPositionY', debugParams.solidModelPositionY);
        updateSolidModelTransform();
    });
    initializeSliderWithNumber('solid-model-position-z', 'solidModelPositionZ', function() {
        if (activeModelInstance) activeModelInstance.updateParam('solidModelPositionZ', debugParams.solidModelPositionZ);
        updateSolidModelTransform();
    });
    initializeSliderWithNumber('solid-model-rotation-x', 'solidModelRotationX', function() {
        if (activeModelInstance) activeModelInstance.updateParam('solidModelRotationX', debugParams.solidModelRotationX);
        updateSolidModelTransform();
    });
    initializeSliderWithNumber('solid-model-rotation-y', 'solidModelRotationY', function() {
        if (activeModelInstance) activeModelInstance.updateParam('solidModelRotationY', debugParams.solidModelRotationY);
        updateSolidModelTransform();
    });
    initializeSliderWithNumber('solid-model-rotation-z', 'solidModelRotationZ', function() {
        if (activeModelInstance) activeModelInstance.updateParam('solidModelRotationZ', debugParams.solidModelRotationZ);
        updateSolidModelTransform();
    });
    
    // Particle position controls (for particle view mode)
    initializeSliderWithNumber('model-position-x', 'modelPositionX', function() {
        if (activeModelInstance && activeModelInstance.currentView === 'particles') {
            activeModelInstance.updateParam('modelPositionX', debugParams.modelPositionX);
            updateParticlePosition();
        }
    });
    initializeSliderWithNumber('model-position-y', 'modelPositionY', function() {
        if (activeModelInstance && activeModelInstance.currentView === 'particles') {
            activeModelInstance.updateParam('modelPositionY', debugParams.modelPositionY);
            updateParticlePosition();
        }
    });
    initializeSliderWithNumber('model-position-z', 'modelPositionZ', function() {
        if (activeModelInstance && activeModelInstance.currentView === 'particles') {
            activeModelInstance.updateParam('modelPositionZ', debugParams.modelPositionZ);
            updateParticlePosition();
        }
    });
    
    // Particle rotation controls (for particle view mode)
    initializeSliderWithNumber('model-rotation-x', 'modelRotationX', function() {
        if (activeModelInstance && activeModelInstance.currentView === 'particles') {
            activeModelInstance.updateParam('modelRotationX', debugParams.modelRotationX);
            reloadParticles();
        }
    });
    initializeSliderWithNumber('model-rotation-y', 'modelRotationY', function() {
        if (activeModelInstance && activeModelInstance.currentView === 'particles') {
            activeModelInstance.updateParam('modelRotationY', debugParams.modelRotationY);
            reloadParticles();
        }
    });
    initializeSliderWithNumber('model-rotation-z', 'modelRotationZ', function() {
        if (activeModelInstance && activeModelInstance.currentView === 'particles') {
            activeModelInstance.updateParam('modelRotationZ', debugParams.modelRotationZ);
            reloadParticles();
        }
    });
    
    // Bloom effect controls
    initializeSliderWithNumber('bloom-threshold', 'bloomThreshold', function() {
        if (activeModelInstance) activeModelInstance.updateParam('bloomThreshold', debugParams.bloomThreshold);
        updateBloomSettings();
    });
    initializeSliderWithNumber('bloom-strength', 'bloomStrength', function() {
        if (activeModelInstance) activeModelInstance.updateParam('bloomStrength', debugParams.bloomStrength);
        updateBloomSettings();
    });
    initializeSliderWithNumber('bloom-radius', 'bloomRadius', function() {
        if (activeModelInstance) activeModelInstance.updateParam('bloomRadius', debugParams.bloomRadius);
        updateBloomSettings();
    });
    
    // Bloom enable/disable toggle
    const bloomToggle = document.getElementById('bloom-enabled');
    if (bloomToggle) {
        bloomToggle.addEventListener('change', function(e) {
            debugParams.bloomEnabled = e.target.checked;
            if (activeModelInstance) activeModelInstance.updateParam('bloomEnabled', debugParams.bloomEnabled);
            updateBloomSettings();
        });
    }
    
    // Tone mapping exposure control
    initializeSliderWithNumber('tone-mapping-exposure', 'toneMappingExposure', function() {
        if (activeModelInstance) activeModelInstance.updateParam('toneMappingExposure', debugParams.toneMappingExposure);
        updateToneMappingExposure();
    });
    
    // Background color controls
    const backgroundColorPicker = document.getElementById('background-color');
    const backgroundColorHex = document.getElementById('background-color-hex');
    
    if (backgroundColorPicker) {
        backgroundColorPicker.addEventListener('input', function(e) {
            debugParams.backgroundColor = e.target.value;
            if (backgroundColorHex) backgroundColorHex.value = e.target.value;
            if (activeModelInstance) activeModelInstance.updateParam('backgroundColor', debugParams.backgroundColor);
            updateBackgroundColor();
        });
    }
    
    if (backgroundColorHex) {
        backgroundColorHex.addEventListener('input', function(e) {
            let hex = e.target.value;
            if (hex.startsWith('#') && (hex.length === 7 || hex.length === 4)) {
                debugParams.backgroundColor = hex;
                if (backgroundColorPicker) backgroundColorPicker.value = hex;
                if (activeModelInstance) activeModelInstance.updateParam('backgroundColor', debugParams.backgroundColor);
                updateBackgroundColor();
            }
        });
    }
    
    // Text color controls
    const primaryTextColorPicker = document.getElementById('primary-text-color');
    const primaryTextColorHex = document.getElementById('primary-text-color-hex');
    const secondaryTextColorPicker = document.getElementById('secondary-text-color');
    const secondaryTextColorHex = document.getElementById('secondary-text-color-hex');
    const accentTextColorPicker = document.getElementById('accent-text-color');
    const accentTextColorHex = document.getElementById('accent-text-color-hex');
    
    // Primary text color
    if (primaryTextColorPicker) {
        primaryTextColorPicker.addEventListener('input', function(e) {
            debugParams.primaryTextColor = e.target.value;
            if (primaryTextColorHex) primaryTextColorHex.value = e.target.value;
            if (activeModelInstance) activeModelInstance.updateParam('primaryTextColor', debugParams.primaryTextColor);
            updateTextColors();
        });
    }
    
    if (primaryTextColorHex) {
        primaryTextColorHex.addEventListener('input', function(e) {
            let hex = e.target.value;
            if (hex.startsWith('#') && (hex.length === 7 || hex.length === 4)) {
                debugParams.primaryTextColor = hex;
                if (primaryTextColorPicker) primaryTextColorPicker.value = hex;
                if (activeModelInstance) activeModelInstance.updateParam('primaryTextColor', debugParams.primaryTextColor);
                updateTextColors();
            }
        });
    }
    
    // Secondary text color
    if (secondaryTextColorPicker) {
        secondaryTextColorPicker.addEventListener('input', function(e) {
            debugParams.secondaryTextColor = e.target.value;
            if (secondaryTextColorHex) secondaryTextColorHex.value = e.target.value;
            if (activeModelInstance) activeModelInstance.updateParam('secondaryTextColor', debugParams.secondaryTextColor);
            updateTextColors();
        });
    }
    
    if (secondaryTextColorHex) {
        secondaryTextColorHex.addEventListener('input', function(e) {
            let hex = e.target.value;
            if (hex.startsWith('#') && (hex.length === 7 || hex.length === 4)) {
                debugParams.secondaryTextColor = hex;
                if (secondaryTextColorPicker) secondaryTextColorPicker.value = hex;
                if (activeModelInstance) activeModelInstance.updateParam('secondaryTextColor', debugParams.secondaryTextColor);
                updateTextColors();
            }
        });
    }
    
    // Accent text color
    if (accentTextColorPicker) {
        accentTextColorPicker.addEventListener('input', function(e) {
            debugParams.accentTextColor = e.target.value;
            if (accentTextColorHex) accentTextColorHex.value = e.target.value;
            if (activeModelInstance) activeModelInstance.updateParam('accentTextColor', debugParams.accentTextColor);
            updateTextColors();
        });
    }
    
    if (accentTextColorHex) {
        accentTextColorHex.addEventListener('input', function(e) {
            let hex = e.target.value;
            if (hex.startsWith('#') && (hex.length === 7 || hex.length === 4)) {
                debugParams.accentTextColor = hex;
                if (accentTextColorPicker) accentTextColorPicker.value = hex;
                if (activeModelInstance) activeModelInstance.updateParam('accentTextColor', debugParams.accentTextColor);
                updateTextColors();
            }
        });
    }
    
    initializeSliderWithNumber('bloom-direction-y', 'bloomDirectionY', function() {
        if (activeModelInstance) activeModelInstance.updateParam('bloomDirectionY', debugParams.bloomDirectionY);
        updateBloomSettings();
    });
    
    // Bloom direction controls
    initializeSliderWithNumber('bloom-direction-x', 'bloomDirectionX', function() {
        if (activeModelInstance) activeModelInstance.updateParam('bloomDirectionX', debugParams.bloomDirectionX);
        updateBloomSettings();
    });
    // Enhanced file input handler (replaces old system)
    const modelFileInput = document.getElementById('load-model');
    if (modelFileInput) {
        modelFileInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            console.log('Enhanced file selected:', file ? file.name : 'none');
            
            if (file) {
                const fileName = file.name.toLowerCase();
                let modelType;
                
                if (fileName.endsWith('.glb') || fileName.endsWith('.gltf')) {
                    modelType = 'glb';
                } else if (fileName.endsWith('.ply')) {
                    modelType = 'ply';
                } else if (fileName.endsWith('.obj')) {
                    modelType = 'obj';
                } else if (fileName.endsWith('.stl')) {
                    modelType = 'stl';
                } else {
                    alert('Unsupported file type. Please use .glb, .gltf, .ply, .obj, or .stl files.');
                    return;
                }
                
                console.log('Enhanced auto-detected model type:', modelType);
                loadCustomModelEnhanced(file, modelType);
                
                // Reset file input
                e.target.value = '';
            }
        });
    }
    
    // Old apply button code removed - using enhanced auto-loading system
    
    // Export parameters
    exportBtn.addEventListener('click', exportParameters);
    
    // Reset to defaults
    resetBtn.addEventListener('click', resetToDefaults);
    
    // Clear all models
    clearBtn.addEventListener('click', clearAllModels);
    
    // Color controls
    const colorPicker = document.getElementById('custom-color');
    const colorHex = document.getElementById('custom-color-hex');
    const useCustomColorCheckbox = document.getElementById('use-custom-color');
    
    // Particle color controls
    const particleColorPicker = document.getElementById('particle-color');
    const particleColorHex = document.getElementById('particle-color-hex');
    
    // Sync color picker with hex input
    colorPicker.addEventListener('input', function(e) {
        debugParams.customColor = e.target.value;
        colorHex.value = e.target.value;
        if (debugParams.useCustomColor) {
            reloadParticles();
        }
    });
    
    // Sync hex input with color picker
    if (colorHex) {
        colorHex.addEventListener('input', function(e) {
            let hex = e.target.value;
            if (hex.startsWith('#') && (hex.length === 7 || hex.length === 4)) {
                debugParams.customColor = hex;
                colorPicker.value = hex;
                if (debugParams.useCustomColor) {
                    reloadParticles();
                }
            }
        });
    }
    
    // Toggle custom color override
    useCustomColorCheckbox.addEventListener('change', function(e) {
        debugParams.useCustomColor = e.target.checked;
        reloadParticles();
    });
    
    // Particle color controls (if they exist)
    if (particleColorPicker) {
        particleColorPicker.addEventListener('input', function(e) {
            debugParams.particleColor = e.target.value;
            if (particleColorHex) particleColorHex.value = e.target.value;
            updateParticleColor();
        });
    }
    
    if (particleColorHex) {
        particleColorHex.addEventListener('input', function(e) {
            let hex = e.target.value;
            if (hex.startsWith('#') && (hex.length === 7 || hex.length === 4)) {
                debugParams.particleColor = hex;
                if (particleColorPicker) particleColorPicker.value = hex;
                updateParticleColor();
            }
        });
    }
    
    
    // Touch radius visibility toggle
    const showTouchRadiusToggle = document.getElementById('show-touch-radius');
    if (showTouchRadiusToggle) {
        showTouchRadiusToggle.addEventListener('change', function(e) {
            showTouchRadius = e.target.checked;
            if (touchRadiusIndicator) {
                touchRadiusIndicator.visible = showTouchRadius;
            }
        });
    }
    // Particle effects toggle
    const particleEffectsCheckbox = document.getElementById('particle-effects-enabled');
    if (particleEffectsCheckbox) {
        particleEffectsCheckbox.addEventListener('change', function(e) {
        debugParams.particleEffectsEnabled = e.target.checked;
        
        // If disabling effects, reset particles to original positions
        if (!debugParams.particleEffectsEnabled && particleSystem && originalPositions) {
            const positions = particleSystem.geometry.attributes.position;
            for (let i = 0; i < originalPositions.length; i++) {
                positions.array[i] = originalPositions[i];
            }
            positions.needsUpdate = true;
        }
        });
    }
    
    // Initialize models list
    updateModelsList();
}

function loadCustomModel(file, type) {
    console.log(`Loading custom model: ${file.name}, type: ${type}`);
    
    const url = URL.createObjectURL(file);
    const modelName = `${file.name}`;
    
    // Store loaded model
    loadedModels[type].push({
        name: modelName,
        path: url,
        isDefault: false,
        file: file
    });
    
    // Set as current model
    currentModelIndex[type] = loadedModels[type].length - 1;
    console.log(`Set current ${type} model index to:`, currentModelIndex[type]);
    
    // Switch to this model type automatically
    debugParams.modelType = type;
    console.log(`Switched to model type: ${type}`);
    
    // Load appropriate defaults for the model type, but preserve particle effects setting
    const currentParticleEffectsEnabled = debugParams.particleEffectsEnabled;
    if (type === 'glb') {
        debugParams = { ...glbDefaults, modelType: 'glb' };
    } else {
        debugParams = { ...plyDefaults, modelType: 'ply' };
    }
    // Restore particle effects setting
    debugParams.particleEffectsEnabled = currentParticleEffectsEnabled;
    console.log('Particle effects enabled:', debugParams.particleEffectsEnabled);
    updateUIFromParams();
    
    // Update display and models list
    updateCurrentModelDisplay();
    updateModelsList();
    
    console.log(`About to load new ${type} model...`);
    // Temporarily reset loading flag to ensure new model loads
    isLoading = false;
    // Load the new model
    loadModel();
}

function deloadCurrentModel() {
    // Clean up current particle system
    if (particleSystem && scene) {
        scene.remove(particleSystem);
        
        // Dispose of geometry and material to free memory
        if (particleSystem.geometry) {
            particleSystem.geometry.dispose();
        }
        if (particleSystem.material) {
            particleSystem.material.dispose();
        }
        
        particleSystem = null;
    }
    
    // Clear particle arrays
    particles = null;
    velocities = null;
    originalPositions = null;
    targetPositions = null;
    
    console.log('Previous model deloaded');
}

function updateCurrentModelDisplay() {
    const currentModelDisplay = document.getElementById('current-model-display');
    if (currentModelDisplay && activeModelInstance) {
        const typeLabel = activeModelInstance.type.toUpperCase();
        const viewMode = activeModelInstance.currentView === 'particles' ? 'Particles' : '3D Model';
        currentModelDisplay.textContent = `${activeModelInstance.name} (${typeLabel} - ${viewMode})`;
    }
}

function updateModelsList() {
    const modelsList = document.getElementById('loaded-models-list');
    if (!modelsList) return;
    
    // Clear existing list
    modelsList.innerHTML = '';
    
    // Add all loaded models from both GLB and PLY
    loadedModels.glb.forEach((model, index) => {
        const modelItem = createModelItem('glb', index, model);
        modelsList.appendChild(modelItem);
    });
    
    loadedModels.ply.forEach((model, index) => {
        const modelItem = createModelItem('ply', index, model);
        modelsList.appendChild(modelItem);
    });
    
    // Show message if no models loaded
    if (loadedModels.glb.length === 0 && loadedModels.ply.length === 0) {
        modelsList.innerHTML = '<div style="padding: 20px; text-align: center; color: rgba(255,255,255,0.5);">No models loaded</div>';
    }
}

function createModelItem(type, index, model) {
    const item = document.createElement('div');
    item.className = 'model-item';
    
    // Check if this is the currently active model
    if (debugParams.modelType === type && currentModelIndex[type] === index) {
        item.classList.add('active');
    }
    
    // Calculate file size if available
    let fileSize = '';
    if (model.file && model.file.size) {
        const sizeKB = (model.file.size / 1024).toFixed(1);
        fileSize = ` • ${sizeKB}KB`;
    }
    
    item.innerHTML = `
        <div class="model-info">
            <div class="model-name">${type.toUpperCase()}: ${model.name}</div>
            <div class="model-details">${model.isDefault ? 'Default' : 'Custom'}${fileSize}</div>
        </div>
        <div class="model-actions">
            <button class="model-btn select-btn" onclick="selectModel('${type}', ${index})">Select</button>
            ${!model.isDefault ? `<button class="model-btn remove-btn" onclick="removeModel('${type}', ${index})">Remove</button>` : ''}
        </div>
    `;
    
    return item;
}

// Make these functions globally accessible
window.selectModel = function(type, index) {
    // Deload current model
    deloadCurrentModel();
    
    // Switch to new model
    debugParams.modelType = type;
    currentModelIndex[type] = index;
    
    // Load appropriate defaults for the model type
    if (type === 'glb') {
        debugParams = { ...glbDefaults, modelType: 'glb' };
    } else {
        debugParams = { ...plyDefaults, modelType: 'ply' };
    }
    
    updateUIFromParams();
    updateCurrentModelDisplay();
    updateModelsList();
    loadModel();
    
    console.log(`Switched to ${type.toUpperCase()} model: ${loadedModels[type][index].name}`);
}

window.removeModel = function(type, index) {
    const model = loadedModels[type][index];
    
    // Don't allow removing default models
    if (model.isDefault) {
        alert('Cannot remove default models');
        return;
    }
    
    // If this is the currently active model, switch to default
    if (debugParams.modelType === type && currentModelIndex[type] === index) {
        selectModel('glb', 0); // Switch to default GLB
    }
    
    // Update loaded models array
    loadedModels[type].splice(index, 1);
    
    // Update model indices
    if (currentModelIndex[type] > index) {
        currentModelIndex[type]--;
    }
    
    // Clean up object URL
    if (model.path && model.path.startsWith('blob:')) {
        URL.revokeObjectURL(model.path);
    }
    
    updateModelsList();
    console.log(`Removed ${type.toUpperCase()} model: ${model.name}`);
}

function updateUIFromParams() {
    // Temporarily disable event listeners to prevent triggering reloads
    const tempLoading = isLoading;
    isLoading = true;
    
    // Update UI controls
    const controls = [
        'particle-size', 'particle-opacity', 'particle-density', 'scale-factor',
        'interaction-radius', 'disperse-force', 'rotation-speed', 'easing-zone',
        'model-rotation-x', 'model-rotation-y', 'model-rotation-z',
        'model-position-x', 'model-position-y', 'model-position-z',        'solid-model-scale', 'solid-model-position-x', 'solid-model-position-y', 'solid-model-position-z',        'solid-model-rotation-x', 'solid-model-rotation-y', 'solid-model-rotation-z'
    ];
    
    controls.forEach(controlId => {
        const slider = document.getElementById(controlId);
        const numberInput = document.getElementById(controlId + '-number');
        const paramKey = controlId.replace(/-([a-z])/g, (match, letter) => letter.toUpperCase());
        
        if (slider && debugParams[paramKey] !== undefined) {
            slider.value = debugParams[paramKey];
        }
        if (numberInput && debugParams[paramKey] !== undefined) {
            numberInput.value = debugParams[paramKey];
        }
    });
    
    // Update checkboxes
    const particleEffectsEnabled = document.getElementById('particle-effects-enabled');
    if (particleEffectsEnabled) particleEffectsEnabled.checked = debugParams.particleEffectsEnabled !== false;
    
    // Restore original loading state
    isLoading = tempLoading;
}

function updateParticlePosition() {
    if (particleSystem) {
        particleSystem.position.set(
            debugParams.modelPositionX || 0,
            debugParams.modelPositionY || 0,
            debugParams.modelPositionZ || 0
        );
    }
}

function clearAllModels() {
    // Clean up scene models
    if (particleSystem) {
        scene.remove(particleSystem);
        particleSystem = null;
        particles = null;
    }
    
    if (solidModel) {
        scene.remove(solidModel);
        solidModel = null;
    }
    
    // Clear interaction arrays
    originalPositions = [];
    targetPositions = [];
    velocities = [];
    
    // Reset to default models only
    loadedModels = {
        glb: [
            { name: 'Default GLB (arturo_site.glb)', path: './models/arturo_site.glb', isDefault: true }
        ],
        ply: [
            { name: 'Default PLY (arturo_site.ply)', path: './source/arturo_site.ply', isDefault: true }
        ]
    };
    
    // Reset indices
    currentModelIndex = { glb: 0, ply: 0 };
    
    // Clear cached model data
    loadedModelData = { glb: null, ply: null };
    gltfModel = null;
    
    // Clear any animation mixer
    if (mixer) {
        mixer.stopAllAction();
        mixer = null;
    }
    
    // Update models list
    updateModelsList();
    
    // Reload the current model type to ensure fresh loading
    if (debugParams.modelType === 'glb') {
        loadGLBModel();
    } else {
        loadPLYPointCloud();
    }
    
    console.log('All custom models cleared. Reset to defaults.');
}

function initializeSliderWithNumber(baseId, paramKey, callback) {
    const slider = document.getElementById(baseId);
    const numberInput = document.getElementById(baseId + '-num');
    
    // Check if elements exist before adding listeners
    if (!slider || !numberInput) {
        console.warn(`Missing elements for ${baseId}: slider=${!!slider}, numberInput=${!!numberInput}`);
        return;
    }
    
    // Sync slider to number input
    slider.addEventListener('input', function(e) {
        if (isLoading) {
            console.log('Slider input blocked during loading:', baseId);
            return; // Skip callbacks during loading/UI updates
        }
        
        const value = parseFloat(e.target.value);
        debugParams[paramKey] = value;
        numberInput.value = value;
        
        if (callback) {
            callback();
        }
    });
    
    // Sync number input to slider
    numberInput.addEventListener('input', (e) => {
        if (isLoading) return; // Skip callbacks during loading/UI updates
        
        const value = parseFloat(e.target.value);
        const min = parseFloat(slider.min);
        const max = parseFloat(slider.max);
        
        // Clamp value to slider range
        const clampedValue = Math.max(min, Math.min(max, value));
        
        debugParams[paramKey] = clampedValue;
        slider.value = clampedValue;
        numberInput.value = clampedValue;
        
        if (callback) {
            callback();
        }
    });
}

function updateParticleSize() {
    if (particleSystem && particleSystem.material) {
        particleSystem.material.size = debugParams.particleSize;
        particleSystem.material.needsUpdate = true;
    }
}

function updateParticleOpacity() {
    if (particleSystem && particleSystem.material) {
        particleSystem.material.opacity = debugParams.particleOpacity;
        particleSystem.material.needsUpdate = true;
    }
}

function updateToneMappingExposure() {
    if (renderer) {
        renderer.toneMappingExposure = debugParams.toneMappingExposure;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
    }
}

function updateBackgroundColor() {
    if (renderer) {
        const color = new THREE.Color(debugParams.backgroundColor);
        renderer.setClearColor(color, 1);
    }
}

function updateTextColors() {
    // Update CSS custom properties for dynamic text coloring
    document.documentElement.style.setProperty('--primary-text-color', debugParams.primaryTextColor);
    document.documentElement.style.setProperty('--secondary-text-color', debugParams.secondaryTextColor);
    document.documentElement.style.setProperty('--accent-text-color', debugParams.accentTextColor);
}

function updateParticleColor() {
    if (particleSystem) {
        const color = new THREE.Color(debugParams.particleColor);
        // Apply color to all particles if not using custom color override
        if (!debugParams.useCustomColor) {
            const colorAttribute = particleSystem.geometry.attributes.color;
            if (colorAttribute) {
                const colors = colorAttribute.array;
                for (let i = 0; i < colors.length; i += 3) {
                    colors[i] = color.r;
                    colors[i + 1] = color.g;
                    colors[i + 2] = color.b;
                }
                colorAttribute.needsUpdate = true;
            }
        }
    }
}

function updateParticleAlpha() {
    if (particleSystem && particleSystem.material) {
        // Use dreamy particles alpha if enabled, otherwise use basic opacity
        const opacity = debugParams.enableDreamyParticles ? 
            debugParams.particleMaxAlpha : 
            debugParams.particleOpacity;
            
        particleSystem.material.opacity = opacity;
        
        // Set alpha test only for dreamy particles
        if (debugParams.enableDreamyParticles) {
            particleSystem.material.alphaTest = debugParams.particleMinAlpha;
        } else {
            particleSystem.material.alphaTest = 0;
        }
        
        particleSystem.material.needsUpdate = true;
        
        // Set particle system to bloom layer for enhanced glow effect
        if (particleSystem.layers) {
            particleSystem.layers.enable(1); // Enable bloom layer
        }
    }
}

// Prevent infinite reload loops with debouncing
let isReloading = false;
let reloadTimeout = null;
let reloadDebounceTimeout = null;

function reloadParticles() {
    // Clear any pending debounced reload
    if (reloadDebounceTimeout) {
        clearTimeout(reloadDebounceTimeout);
    }
    
    // Debounce rapid successive calls
    reloadDebounceTimeout = setTimeout(() => {
        performReload();
    }, 150); // 150ms debounce
}

function performReload() {
    // Clear any pending reload
    if (reloadTimeout) {
        clearTimeout(reloadTimeout);
    }
    
    // Prevent multiple simultaneous reloads
    if (isReloading) {
        console.log('Reload already in progress, skipping...');
        return;
    }
    
    // Use enhanced model system instead of old global system
    if (activeModelInstance && activeModelInstance.currentView === 'particles') {
        isReloading = true;
        console.log(`Reloading particles for active model: ${activeModelInstance.name}`);
        
        // Clean up particle system
        if (activeModelInstance.particleSystem) {
            scene.remove(activeModelInstance.particleSystem);
            activeModelInstance.particleSystem = null;
        }
        
        // Clear global references
        particleSystem = null;
        particles = null;
        originalPositions = [];
        targetPositions = [];
        velocities = [];
        
        // Recreate particle system for the active model
        activeModelInstance.createParticleSystem().then(() => {
            isReloading = false;
        }).catch((error) => {
            console.error('Error reloading particles:', error);
            isReloading = false;
        });
    } else {
        console.warn('No active model instance in particle mode to reload');
    }
}

function exportParameters() {
    const currentModel = loadedModels[debugParams.modelType][currentModelIndex[debugParams.modelType]];
    
    const params = {
        // Particle parameters
        particleSize: debugParams.particleSize,
        particleOpacity: debugParams.particleOpacity,
        particleDensity: debugParams.particleDensity,
        scaleFactor: debugParams.scaleFactor,
        interactionRadius: debugParams.interactionRadius,
        disperseForce: debugParams.disperseForce,
        
        // Animation parameters
        rotationSpeed: debugParams.rotationSpeed,
        easingZone: debugParams.easingZone,
        rotationMinDegrees: debugParams.rotationMinDegrees,
        rotationMaxDegrees: debugParams.rotationMaxDegrees,
        
        // Bloom parameters
        bloomThreshold: debugParams.bloomThreshold,
        bloomStrength: debugParams.bloomStrength,
        bloomRadius: debugParams.bloomRadius,
        bloomEnabled: debugParams.bloomEnabled,
        bloomDirectionX: debugParams.bloomDirectionX,
        bloomDirectionY: debugParams.bloomDirectionY,
        
        // Model parameters
        modelType: debugParams.modelType,
        modelRotationX: debugParams.modelRotationX,
        modelRotationY: debugParams.modelRotationY,
        modelRotationZ: debugParams.modelRotationZ,
        modelPositionX: debugParams.modelPositionX,
        modelPositionY: debugParams.modelPositionY,
        modelPositionZ: debugParams.modelPositionZ,
        
        // 3D Model controls
        solidModelScale: debugParams.solidModelScale,
        solidModelPositionX: debugParams.solidModelPositionX,
        solidModelPositionY: debugParams.solidModelPositionY,
        solidModelPositionZ: debugParams.solidModelPositionZ,
        solidModelRotationX: debugParams.solidModelRotationX,
        solidModelRotationY: debugParams.solidModelRotationY,
        solidModelRotationZ: debugParams.solidModelRotationZ,
        
        // Color parameters
        customColor: debugParams.customColor,
        useCustomColor: debugParams.useCustomColor,
        particleColor: debugParams.particleColor,
        
        // Effects and display
        particleEffectsEnabled: debugParams.particleEffectsEnabled,
        showAsParticles: debugParams.showAsParticles,
        showAs3DModel: debugParams.showAs3DModel,
        enableDreamyParticles: debugParams.enableDreamyParticles,
        
        // Tone mapping
        toneMappingExposure: debugParams.toneMappingExposure,
        
        // Dreamy particle controls
        particleForce: debugParams.particleForce,
        particleMinAlpha: debugParams.particleMinAlpha,
        particleMaxAlpha: debugParams.particleMaxAlpha,
        
        // Model info
        currentModelName: currentModel.name,
        currentModelPath: currentModel.isDefault ? currentModel.path : 'Custom file loaded',
        totalLoadedModels: {
            glb: loadedModels.glb.length,
            ply: loadedModels.ply.length
        }
    };
    
    console.log('=== PARTICLE PARAMETERS ===');
    console.log(JSON.stringify(params, null, 2));
    console.log('=== END PARAMETERS ===');
    
    // Also copy to clipboard if possible
    if (navigator.clipboard) {
        navigator.clipboard.writeText(JSON.stringify(params, null, 2))
            .then(() => console.log('Parameters copied to clipboard!'))
            .catch(() => console.log('Could not copy to clipboard'));
    }
    
    alert('Parameters exported to console! Check the browser console (F12) for the JSON data.');
}

function resetToDefaults() {
    // Reset to appropriate defaults based on current model type
    if (debugParams.modelType === 'glb') {
        debugParams = { ...glbDefaults };
    } else {
        debugParams = { ...plyDefaults };
    }
    
    updateUIFromParams();
    // Don't auto-reload particles to avoid infinite loop
}

function reloadModel() {
    if (isLoading) {
        console.log('Model reload already in progress, skipping...');
        return;
    }
    
    console.log('RELOAD MODEL CALLED - Stack trace:');
    console.trace();
    
    // Clear existing particle system
    if (particleSystem) {
        scene.remove(particleSystem);
        particleSystem = null;
        particles = null;
    }
    
    // Clear existing solid model
    if (solidModel) {
        scene.remove(solidModel);
        solidModel = null;
    }
    
    // Load new model based on type
    loadModel();
}

function setupPostProcessing() {
    // Create effect composer
    composer = new EffectComposer(renderer);
    
    // Render pass
    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);
    
    // Bloom pass for dreamy particles
    bloomPass = new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        debugParams.bloomStrength,
        debugParams.bloomRadius,
        debugParams.bloomThreshold
    );
    
    // Configure bloom for dreamy particles effect
    bloomPass.enabled = debugParams.bloomEnabled;
    
    // Set up selective bloom rendering
    const bloomLayer = new THREE.Layers();
    bloomLayer.set(1);
    
    // Configure bloom materials for better dreamy effect
    const darkMaterial = new THREE.MeshBasicMaterial({ color: 'black' });
    const materials = {};
    
    composer.addPass(bloomPass);
    
    // Output pass
    const outputPass = new OutputPass();
    composer.addPass(outputPass);
}

function updateBloomSettings() {
    if (bloomPass) {
        bloomPass.threshold = debugParams.bloomThreshold;
        bloomPass.strength = debugParams.bloomStrength;
        bloomPass.radius = debugParams.bloomRadius;
        bloomPass.enabled = debugParams.bloomEnabled;
        
        // Apply bloom direction by modifying the bloom pass resolution
        const dirX = debugParams.bloomDirectionX || 0.97;
        const dirY = debugParams.bloomDirectionY || 0.18;
        
        // Create anisotropic bloom effect by adjusting resolution
        const baseWidth = window.innerWidth;
        const baseHeight = window.innerHeight;
        
        bloomPass.resolution = new THREE.Vector2(
            baseWidth * dirX,
            baseHeight * dirY
        );
    }
}

function onMouseMove(event) {
    if (reducedMotion) return;
  
    // Use renderer/canvas dimensions for accurate coordinate mapping
    const canvas = renderer.domElement;
    const rect = canvas.getBoundingClientRect();
    
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    
    // Show and update touch radius indicator
    if (touchRadiusIndicator && showTouchRadius) {
        touchRadiusIndicator.visible = true;
        const modelScale = activeModelInstance ? activeModelInstance.particleParams.scaleFactor : debugParams.scaleFactor;
        const baseRadius = debugParams.interactionRadius || 2.8;
        const interactionRadius = baseRadius * (modelScale / 12);
        updateTouchRadiusIndicator(mouse, interactionRadius);
    }
    
    // Always interact with particles (whether from model or fallback)
    if (particleSystem) {
        interactWithParticles();
    }
}

function onTouchMove(event) {
    if (reducedMotion) return;

    event.preventDefault();
    const touch = event.touches[0];
    
    // Use renderer/canvas dimensions for accurate coordinate mapping
    const canvas = renderer.domElement;
    const rect = canvas.getBoundingClientRect();
    
    // Calculate coordinates relative to the visible canvas area
    let touchX = touch.clientX;
    let touchY = touch.clientY;
    
    // On mobile, check if debug panel is visible and adjust coordinates
    const debugPanel = document.getElementById('particle-debug');
    const isMobile = window.innerWidth <= 767;
    
    if (isMobile && debugPanel && !debugPanel.classList.contains('hidden')) {
        // Debug panel takes bottom 50% on mobile, so adjust touch coordinates
        // to account for the reduced canvas area
        const debugPanelHeight = window.innerHeight * 0.5;
        const availableHeight = window.innerHeight - debugPanelHeight;
        
        // Remap Y coordinate to the available canvas area (top 50%)
        if (touchY < availableHeight) {
            // Touch is in the canvas area, remap to full coordinate space
            touchY = (touchY / availableHeight) * window.innerHeight;
        } else {
            // Touch is in debug panel area, ignore
            return;
        }
    }
    
    mouse.x = ((touchX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((touchY - rect.top) / rect.height) * 2 + 1;
    
    // Show and update touch radius indicator
    if (touchRadiusIndicator && showTouchRadius) {
        touchRadiusIndicator.visible = true;
        const modelScale = activeModelInstance ? activeModelInstance.particleParams.scaleFactor : debugParams.scaleFactor;
        const baseRadius = debugParams.interactionRadius || 2.8;
        const interactionRadius = baseRadius * (modelScale / 12);
        updateTouchRadiusIndicator(mouse, interactionRadius);
    }
    
    // Always interact with particles (whether from model or fallback)
    if (particleSystem) {
        interactWithParticles();
    }
}


function interactWithParticles() {
    if (!particleSystem || !particles || !originalPositions || !velocities) {
        return;
    }
    
    raycaster.setFromCamera(mouse, camera);
    
    // Create interaction sphere at mouse position in 3D space
    const interactionPoint = new THREE.Vector3();
    raycaster.ray.at(3, interactionPoint);
    
    const positions = particles.array;
    
    // Scale interaction parameters based on model size for consistent behavior
    const modelScale = activeModelInstance ? activeModelInstance.particleParams.scaleFactor : debugParams.scaleFactor;
    const baseRadius = debugParams.interactionRadius || 2.8;
    const baseForce = debugParams.disperseForce || 0.15;
    
    // Normalize interaction radius and force based on model scale
    const interactionRadius = baseRadius * (modelScale / 12); // 12 is our reference scale
    const disperseForce = baseForce * Math.sqrt(modelScale / 12); // Square root for more natural scaling
    
    let interactedParticles = 0;
    
    for (let i = 0; i < positions.length; i += 3) {
        const particlePos = new THREE.Vector3(positions[i], positions[i + 1], positions[i + 2]);
        const distance = interactionPoint.distanceTo(particlePos);
        
        if (distance < interactionRadius) {
            // Calculate dispersion force based on distance
            const force = (interactionRadius - distance) / interactionRadius * disperseForce;
            const direction = new THREE.Vector3()
                .subVectors(particlePos, interactionPoint)
                .normalize();
            
            // Apply immediate velocity for dynamic movement
            velocities[i] += direction.x * force;
            velocities[i + 1] += direction.y * force;
            velocities[i + 2] += direction.z * force;
            
            interactedParticles++;
        }
    }
    
    // Debug log occasionally
    if (interactedParticles > 0 && Math.random() < 0.01) {
        console.log(`Interacting with ${interactedParticles} particles, radius: ${interactionRadius}, force: ${disperseForce}`);
    }
}

function animate() {
    if (!reducedMotion) {
        // Handle particle system animations
        if (particleSystem) {
            // Only update particle interactions if effects are enabled
            if (debugParams.particleEffectsEnabled) {
                updateParticles();
            } else {
                // Debug: Log when effects are disabled
                if (Math.random() < 0.001) { // Log occasionally to avoid spam
                    console.log('Particle effects disabled in debugParams');
                }
            }
        } else {
            // Debug: Log when no particle system
            if (Math.random() < 0.001) { // Log occasionally to avoid spam
                console.log('No particle system found in animate loop');
            }
        }
        
        // Apply particle force effects (always enabled)
        applyParticleForceEffects();
        
        // Calculate eased rotation with smooth endpoints using debug parameters
        const maxRotationYDynamic = (debugParams.rotationMaxDegrees * Math.PI) / 180;
        const minRotationYDynamic = (debugParams.rotationMinDegrees * Math.PI) / 180;
        const rotationRange = maxRotationYDynamic - minRotationYDynamic;
        const currentProgress = (currentRotationY - minRotationYDynamic) / rotationRange;
        
        // Calculate distance to nearest endpoint
        let distanceToEnd;
        if (rotationDirection > 0) {
            distanceToEnd = (maxRotationYDynamic - currentRotationY) / rotationRange;
        } else {
            distanceToEnd = (currentRotationY - minRotationYDynamic) / rotationRange;
        }
        
        // Apply easing when close to endpoints
        let speedMultiplier = 1.0;
        if (distanceToEnd < debugParams.easingZone) {
            // Smooth ease-out using cosine interpolation
            const easingProgress = distanceToEnd / debugParams.easingZone;
            speedMultiplier = 0.1 + 0.9 * (1 - Math.cos(easingProgress * Math.PI * 0.5));
        }
        
        // Apply rotation with eased speed
        currentRotationY += debugParams.rotationSpeed * rotationDirection * speedMultiplier;
        
        // Check bounds and reverse direction with smooth transition
        if (currentRotationY >= maxRotationYDynamic) {
            currentRotationY = maxRotationYDynamic;
            rotationDirection = -1;
        } else if (currentRotationY <= minRotationYDynamic) {
            currentRotationY = minRotationYDynamic;
            rotationDirection = 1;
        }
        
        // Apply rotation to particle system
        if (particleSystem) {
            particleSystem.rotation.y = currentRotationY;
        }
        
        // Handle solid model animations
        if (solidModel) {
            // Calculate eased rotation for solid model
            const maxRotationYDynamic = (debugParams.rotationMaxDegrees * Math.PI) / 180;
            const minRotationYDynamic = (debugParams.rotationMinDegrees * Math.PI) / 180;
            const rotationRange = maxRotationYDynamic - minRotationYDynamic;
            
            // Calculate distance to nearest endpoint
            let distanceToEnd;
            if (rotationDirection > 0) {
                distanceToEnd = (maxRotationYDynamic - currentRotationY) / rotationRange;
            } else {
                distanceToEnd = (currentRotationY - minRotationYDynamic) / rotationRange;
            }
            
            // Apply easing when close to endpoints
            let speedMultiplier = 1.0;
            if (distanceToEnd < debugParams.easingZone) {
                const easingProgress = distanceToEnd / debugParams.easingZone;
                speedMultiplier = 0.1 + 0.9 * (1 - Math.cos(easingProgress * Math.PI * 0.5));
            }
            
            // Apply rotation with eased speed
            currentRotationY += debugParams.rotationSpeed * rotationDirection * speedMultiplier;
            
            // Check bounds and reverse direction
            if (currentRotationY >= maxRotationYDynamic) {
                currentRotationY = maxRotationYDynamic;
                rotationDirection = -1;
            } else if (currentRotationY <= minRotationYDynamic) {
                currentRotationY = minRotationYDynamic;
                rotationDirection = 1;
            }
            
            // Apply rotation to particle system (add to base rotation)
            if (particleSystem) {
                particleSystem.rotation.y = (debugParams.modelRotationY * Math.PI) / 180 + currentRotationY;
            }
            
            // Apply rotation to solid model if it exists
            if (solidModel) {
                solidModel.rotation.y = (debugParams.modelRotationY * Math.PI) / 180 + currentRotationY;
            }
        }
        
        // Animation mixer update
        if (mixer) {
            mixer.update(0.016); // ~60fps
        }
    }
    
    // Use composer for post-processing instead of direct render
    if (composer && debugParams.bloomEnabled) {
        composer.render();
    } else {
        renderer.render(scene, camera);
    }
    requestAnimationFrame(animate);
}

function applyParticleForceEffects() {
    if (!particleSystem || !particles) return;
    
    const positions = particles.array;
    const particleForce = debugParams.particleForce || 0.58;
    const time = Date.now() * 0.001;
    
    // Apply subtle floating motion based on particle force
    for (let i = 0; i < positions.length; i += 3) {
        const originalX = originalPositions[i];
        const originalY = originalPositions[i + 1];
        const originalZ = originalPositions[i + 2];
        
        // Create gentle floating motion
        const floatX = Math.sin(time * 0.5 + originalX * 0.1) * particleForce * 0.1;
        const floatY = Math.cos(time * 0.3 + originalY * 0.1) * particleForce * 0.15;
        const floatZ = Math.sin(time * 0.4 + originalZ * 0.1) * particleForce * 0.08;
        
        // Only apply floating motion if particles are at rest (not being dispersed or returning)
        const isAtRest = Math.abs(velocities[i]) < 0.001 && 
                         Math.abs(velocities[i + 1]) < 0.001 && 
                         Math.abs(velocities[i + 2]) < 0.001;
        
        const distanceFromOriginal = Math.sqrt(
            Math.pow(positions[i] - originalX, 2) +
            Math.pow(positions[i + 1] - originalY, 2) +
            Math.pow(positions[i + 2] - originalZ, 2)
        );
        
        // Only apply dreamy effects when particles are close to their original positions
        if (!debugParams.particleEffectsEnabled || (isAtRest && distanceFromOriginal < 0.1)) {
            positions[i] = originalX + floatX;
            positions[i + 1] = originalY + floatY;
            positions[i + 2] = originalZ + floatZ;
        }
    }
    
    particles.needsUpdate = true;
}

function updateParticles() {
    if (!particles || !originalPositions || !velocities) {
        return;
    }
    
    const positions = particles.array;
    const easingZone = debugParams.easingZone || 0.3;
    
    for (let i = 0; i < positions.length; i += 3) {
        // Apply velocity
        positions[i] += velocities[i];
        positions[i + 1] += velocities[i + 1];
        positions[i + 2] += velocities[i + 2];
        
        // Calculate distance from original position
        const distanceFromOriginal = Math.sqrt(
            Math.pow(positions[i] - originalPositions[i], 2) +
            Math.pow(positions[i + 1] - originalPositions[i + 1], 2) +
            Math.pow(positions[i + 2] - originalPositions[i + 2], 2)
        );
        
        // Use easing zone to determine return force - stronger when further away
        const returnForce = Math.min(0.08, 0.01 + (distanceFromOriginal * easingZone * 0.1));
        
        // Smooth return to original positions (not target positions)
        positions[i] += (originalPositions[i] - positions[i]) * returnForce;
        positions[i + 1] += (originalPositions[i + 1] - positions[i + 1]) * returnForce;
        positions[i + 2] += (originalPositions[i + 2] - positions[i + 2]) * returnForce;
        
        // Apply progressive dampening - more dampening when closer to original position
        const dampening = 0.92 + (0.06 * Math.max(0, 1 - distanceFromOriginal));
        velocities[i] *= dampening;
        velocities[i + 1] *= dampening;
        velocities[i + 2] *= dampening;
        
        // Gradually reset target positions to original positions
        const targetReturnRate = 0.05;
        targetPositions[i] += (originalPositions[i] - targetPositions[i]) * targetReturnRate;
        targetPositions[i + 1] += (originalPositions[i + 1] - targetPositions[i + 1]) * targetReturnRate;
        targetPositions[i + 2] += (originalPositions[i + 2] - targetPositions[i + 2]) * targetReturnRate;
    }
    
    particles.needsUpdate = true;
}

function onWindowResize() {
    if (camera && renderer) {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
        
        // Update composer size
        if (composer) {
            composer.setSize(window.innerWidth, window.innerHeight);
        }
    }
}

function handleWebGLError() {
    isWebGLSupported = false;
    const errorModal = document.getElementById('error-modal');
    if (errorModal) {
        errorModal.classList.remove('hidden');
    }
    
    // Hide canvas and show fallback
    const canvasContainer = document.getElementById('canvas-container');
    if (canvasContainer) {
        canvasContainer.style.display = 'none';
    }
    
    // Update hint text
    const hint = document.querySelector('.interaction-hint');
    if (hint) {
        hint.textContent = 'WebGL not supported on this device';
    }
}

function closeErrorModal() {
    const errorModal = document.getElementById('error-modal');
    if (errorModal) {
        errorModal.classList.add('hidden');
    }
}

function initializeVFXCanvas(canvasId, index) {
    if (!isWebGLSupported) return;
    
    try {
        const canvas = document.getElementById(canvasId);
        if (!canvas) {
            console.error('VFX canvas not found:', canvasId);
            return;
        }
        
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
        const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
        
        renderer.setSize(canvas.clientWidth, canvas.clientHeight);
        renderer.setClearColor(0x000000, 0);
        
        // Create different 3D objects for each VFX item
        let object;
        const geometry = getVFXGeometry(index);
        const material = getVFXMaterial(index);
        object = new THREE.Mesh(geometry, material);
        
        scene.add(object);
        camera.position.z = 3;
        
        // Animation loop for this canvas
        function animateVFX() {
            if (!reducedMotion && object) {
                object.rotation.x += 0.01;
                object.rotation.y += 0.01;
            }
            renderer.render(scene, camera);
            requestAnimationFrame(animateVFX);
        }
        animateVFX();
        
        // Handle canvas interaction
        canvas.addEventListener('click', function() {
            if (object && !reducedMotion) {
                object.rotation.x += 0.5;
                object.rotation.y += 0.5;
            }
        });
        
        console.log('VFX canvas initialized:', canvasId);
        
    } catch (error) {
        console.error('VFX canvas initialization failed:', error);
        // Show fallback content
        const canvas = document.getElementById(canvasId);
        if (canvas) {
            canvas.style.background = 'linear-gradient(135deg, #4e88c7, #95b5df)';
            canvas.style.display = 'flex';
            canvas.style.alignItems = 'center';
            canvas.style.justifyContent = 'center';
            canvas.innerHTML = '<span style="color: white; font-size: 2rem;">🎭</span>';
        }
    }
}

function getVFXGeometry(index) {
    const geometries = [
        new THREE.BoxGeometry(1, 1, 1),
        new THREE.SphereGeometry(0.7, 32, 32),
        new THREE.ConeGeometry(0.7, 1.5, 32),
        new THREE.TorusGeometry(0.7, 0.3, 16, 100),
        new THREE.OctahedronGeometry(0.8),
        new THREE.IcosahedronGeometry(0.8)
    ];
    return geometries[index % geometries.length];
}

function getVFXMaterial(index) {
    const materials = [
        new THREE.MeshBasicMaterial({ color: 0xA51C30, wireframe: true }),
        new THREE.MeshBasicMaterial({ color: 0x4e88c7, transparent: true, opacity: 0.7 }),
        new THREE.MeshBasicMaterial({ color: 0x95b5df }),
        new THREE.MeshBasicMaterial({ color: 0x93a1ad, wireframe: true }),
        new THREE.MeshBasicMaterial({ color: 0xA51C30, transparent: true, opacity: 0.8 }),
        new THREE.MeshBasicMaterial({ color: 0x4e88c7, wireframe: true })
    ];
    return materials[index % materials.length];
}

// Global functions for HTML onclick handlers
window.closeErrorModal = closeErrorModal;
function updateSolidModelTransform() {
    if (solidModel) {
        solidModel.scale.set(
            debugParams.solidModelScale,
            debugParams.solidModelScale,
            debugParams.solidModelScale
        );
        solidModel.position.set(
            debugParams.solidModelPositionX,
            debugParams.solidModelPositionY,
            debugParams.solidModelPositionZ
        );
        solidModel.rotation.set(
            THREE.MathUtils.degToRad(debugParams.solidModelRotationX),
            THREE.MathUtils.degToRad(debugParams.solidModelRotationY),
            THREE.MathUtils.degToRad(debugParams.solidModelRotationZ)
        );
        console.log('Updated solid model transform');
    }
}

// Enhanced Model Instance Management System
class ModelInstance {
    constructor(name, type, path, isDefault = false) {
        this.id = `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        this.name = name;
        this.type = type; // 'glb' or 'ply'
        this.path = path;
        this.isDefault = isDefault;
        
        // Current view mode: '3d' or 'particles' (default to 3D)
        this.currentView = '3d';
        
        // Separate parameter sets
        this.particleParams = this.getDefaultParams('particle');
        this.modelParams = this.getDefaultParams('3d');
        
        // Three.js object references
        this.particleSystem = null;
        this.solidModel = null;
        
        // Track parameter modifications
        this.particleParamsTweaked = false;
        this.modelParamsTweaked = false;
        
        // Dreamy particles state
        this.dreamyParticlesEnabled = false;
        
        // Auto-create 3D model on instantiation
        this.createSolidModel();
    }
    
    getDefaultParams(version) {
        const baseDefaults = this.type === 'glb' ? glbDefaults : plyDefaults;
        
        if (version === 'particle') {
            return {
                particleSize: baseDefaults.particleSize,
                particleOpacity: baseDefaults.particleOpacity,
                particleDensity: baseDefaults.particleDensity,
                scaleFactor: baseDefaults.scaleFactor,
                interactionRadius: baseDefaults.interactionRadius,
                disperseForce: baseDefaults.disperseForce,
                rotationSpeed: baseDefaults.rotationSpeed,
                easingZone: baseDefaults.easingZone,
                modelPositionX: baseDefaults.modelPositionX || 0,
                modelPositionY: baseDefaults.modelPositionY || 0,
                modelPositionZ: baseDefaults.modelPositionZ || 0,
                modelRotationX: baseDefaults.modelRotationX || 0,
                modelRotationY: baseDefaults.modelRotationY || 0,
                modelRotationZ: baseDefaults.modelRotationZ || 0,
                customColor: baseDefaults.customColor || '#ffffff',
                useCustomColor: baseDefaults.useCustomColor || false,
                particleEffectsEnabled: true,
                // Dreamy particle settings
                enableDreamyParticles: false,
                particleColor: baseDefaults.particleColor || '#791630',
                particleForce: baseDefaults.particleForce || 0.58,
                particleMinAlpha: baseDefaults.particleMinAlpha || 0.04,
                particleMaxAlpha: baseDefaults.particleMaxAlpha || 0.25
            };
        } else {
            return {
                solidModelScale: 1,
                solidModelPositionX: 0,
                solidModelPositionY: 0,
                solidModelPositionZ: 0,
                solidModelRotationX: 0,
                solidModelRotationY: 0,
                solidModelRotationZ: 0,
                customColor: baseDefaults.customColor || '#ffffff',
                useCustomColor: false,
                // Material properties for 3D models
                metalness: 0.0,
                roughness: 0.5,
                emissive: '#000000',
                emissiveIntensity: 0.0
            };
        }
    }
    
    switchView(newView) {
        if (this.currentView === newView) return;
        
        console.log(`Switching ${this.name} from ${this.currentView} to ${newView}`);
        
        // Hide current representation
        if (this.currentView === 'particles' && this.particleSystem) {
            scene.remove(this.particleSystem);
        } else if (this.currentView === '3d' && this.solidModel) {
            scene.remove(this.solidModel);
        }
        
        this.currentView = newView;
        
        // Show new representation
        if (newView === 'particles') {
            if (!this.particleSystem) {
                this.createParticleSystem();
            } else {
                scene.add(this.particleSystem);
                // Set global references for animation loop compatibility
                particleSystem = this.particleSystem;
                particles = this.particleSystem.geometry.attributes.position;
                
                // Initialize interaction arrays for particle effects
                const positions = particles.array;
                originalPositions = [...positions]; // Copy original positions
                velocities = new Float32Array(positions.length); // Initialize velocities to zero
                targetPositions = new Float32Array(positions.length); // Initialize target positions
            }
            this.updateGlobalParams();
        } else {
            if (!this.solidModel) {
                this.createSolidModel();
            } else {
                scene.add(this.solidModel);
            }
            // Clear global particle references when in 3D mode
            particleSystem = null;
            particles = null;
            this.updateGlobalParams();
        }
        
        updateEnhancedModelsList();
        updateContextSensitiveUI();
        updateCurrentModelDisplay();
    }
    
    updateGlobalParams() {
        if (this.currentView === 'particles') {
            Object.assign(debugParams, this.particleParams);
        } else {
            Object.assign(debugParams, this.modelParams);
        }
        debugParams.modelType = this.type;
        updateUIFromParams();
    }
    
    updateParam(paramName, value) {
        if (this.currentView === 'particles') {
            this.particleParams[paramName] = value;
            this.particleParamsTweaked = true;
        } else {
            this.modelParams[paramName] = value;
            this.modelParamsTweaked = true;
        }
    }
    
    exportParams() {
        const currentParams = this.currentView === 'particles' ? this.particleParams : this.modelParams;
        
        const exportData = {
            modelName: this.name,
            modelType: this.type,
            viewMode: this.currentView,
            parameters: { ...currentParams },
            tweaked: this.currentView === 'particles' ? this.particleParamsTweaked : this.modelParamsTweaked
        };
        
        console.log(`${this.name} ${this.currentView} parameters:`, exportData);
        
        if (navigator.clipboard) {
            navigator.clipboard.writeText(JSON.stringify(exportData, null, 2));
            console.log('Parameters copied to clipboard');
        }
        
        return exportData;
    }
    
    async createParticleSystem() {
        console.log(`Creating particle system for: ${this.name}`);
        
        try {
            let geometry;
            
            if (this.type === 'glb') {
                const loader = new GLTFLoader();
                const gltf = await new Promise((resolve, reject) => {
                    loader.load(this.path, resolve, undefined, reject);
                });
                
                const vertices = [];
                gltf.scene.traverse((child) => {
                    if (child.isMesh && child.geometry) {
                        const positions = child.geometry.attributes.position.array;
                        for (let i = 0; i < positions.length; i += 3) {
                            vertices.push(positions[i], positions[i + 1], positions[i + 2]);
                        }
                    }
                });
                
                geometry = new THREE.BufferGeometry();
                geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
                
            } else {
                const loader = new PLYLoader();
                geometry = await new Promise((resolve, reject) => {
                    loader.load(this.path, resolve, undefined, reject);
                });
            }
            
            this.particleSystem = this.createParticleSystemFromGeometry(geometry);
            
            if (this.currentView === 'particles') {
                scene.add(this.particleSystem);
                // Set global references for animation loop compatibility
                particleSystem = this.particleSystem;
                particles = this.particleSystem.geometry.attributes.position;
                
                // Initialize interaction arrays for particle effects
                const positions = particles.array;
                originalPositions = [...positions]; // Copy original positions
                velocities = new Float32Array(positions.length); // Initialize velocities to zero
                targetPositions = new Float32Array(positions.length); // Initialize target positions
                
                console.log('Initialized particle interaction arrays:', {
                    positions: positions.length,
                    originalPositions: originalPositions.length,
                    velocities: velocities.length
                });
            }
            
        } catch (error) {
            console.error(`Failed to create particle system for ${this.name}:`, error);
        }
    }
    
    async createSolidModel() {
        console.log(`Creating solid model for: ${this.name}`);
        
        try {
            let model;
            
            if (this.type === 'glb') {
                const loader = new GLTFLoader();
                const gltf = await new Promise((resolve, reject) => {
                    loader.load(this.path, resolve, undefined, reject);
                });
                model = gltf.scene.clone();
            } else if (this.type === 'obj') {
                const loader = new OBJLoader();
                model = await new Promise((resolve, reject) => {
                    loader.load(this.path, resolve, undefined, reject);
                });
            } else if (this.type === 'stl') {
                const loader = new STLLoader();
                const geometry = await new Promise((resolve, reject) => {
                    loader.load(this.path, resolve, undefined, reject);
                });
                
                const material = new THREE.MeshStandardMaterial({
                    color: 0x888888,
                    metalness: this.modelParams.metalness || 0.1,
                    roughness: this.modelParams.roughness || 0.8
                });
                
                model = new THREE.Mesh(geometry, material);
            } else {
                // PLY and other geometry-based formats
                const loader = new PLYLoader();
                const geometry = await new Promise((resolve, reject) => {
                    loader.load(this.path, resolve, undefined, reject);
                });
                
                const material = new THREE.MeshStandardMaterial({
                    vertexColors: geometry.attributes.color ? true : false,
                    color: geometry.attributes.color ? 0xffffff : 0x888888,
                    metalness: this.modelParams.metalness || 0.1,
                    roughness: this.modelParams.roughness || 0.8
                });
                
                model = new THREE.Mesh(geometry, material);
            }
            
            this.applySolidModelParams(model);
            this.solidModel = model;
            
            if (this.currentView === '3d') {
                scene.add(model);
            }
            
        } catch (error) {
            console.error(`Failed to create solid model for ${this.name}:`, error);
        }
    }
    
    createParticleSystemFromGeometry(geometry) {
        const positions = geometry.attributes.position.array;
        const colors = geometry.attributes.color ? geometry.attributes.color.array : null;
        
        const scaledPositions = [];
        
        // Create rotation matrices for X, Y, Z rotations
        const rotX = THREE.MathUtils.degToRad(this.particleParams.modelRotationX || 0);
        const rotY = THREE.MathUtils.degToRad(this.particleParams.modelRotationY || 0);
        const rotZ = THREE.MathUtils.degToRad(this.particleParams.modelRotationZ || 0);
        
        const rotationMatrix = new THREE.Matrix4();
        rotationMatrix.makeRotationFromEuler(new THREE.Euler(rotX, rotY, rotZ));
        
        for (let i = 0; i < positions.length; i += 3) {
            // Apply rotation first, then scale and position
            const vertex = new THREE.Vector3(positions[i], positions[i + 1], positions[i + 2]);
            vertex.applyMatrix4(rotationMatrix);
            
            scaledPositions.push(
                vertex.x * this.particleParams.scaleFactor + this.particleParams.modelPositionX,
                vertex.y * this.particleParams.scaleFactor + this.particleParams.modelPositionY,
                vertex.z * this.particleParams.scaleFactor + this.particleParams.modelPositionZ
            );
        }
        
        const particleGeometry = new THREE.BufferGeometry();
        particleGeometry.setAttribute('position', new THREE.Float32BufferAttribute(scaledPositions, 3));
        
        // Handle colors - use custom color if enabled, otherwise use existing colors or gradient
        let colorArray;
        console.log('Enhanced model color check:', {
            useCustomColor: debugParams.useCustomColor,
            customColor: debugParams.customColor,
            particleParamsUseCustomColor: this.particleParams?.useCustomColor,
            particleParamsCustomColor: this.particleParams?.customColor
        });
        
        const useCustomColor = debugParams.useCustomColor || this.particleParams?.useCustomColor;
        const customColor = debugParams.customColor || this.particleParams?.customColor;
        
        if (useCustomColor && customColor) {
            // Use custom color for all particles
            console.log('Applying custom color:', customColor);
            const colorObj = new THREE.Color(customColor);
            colorArray = new Float32Array(scaledPositions.length);
            for (let i = 0; i < scaledPositions.length; i += 3) {
                colorArray[i] = colorObj.r;
                colorArray[i + 1] = colorObj.g;
                colorArray[i + 2] = colorObj.b;
            }
            particleGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colorArray, 3));
        } else if (colors) {
            particleGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        } else {
            // Use a more natural color scheme - white/blue gradient based on height
            colorArray = new Float32Array(scaledPositions.length);
            for (let i = 0; i < scaledPositions.length; i += 3) {
                const y = scaledPositions[i + 1];
                const normalizedHeight = Math.max(0, Math.min(1, (y + 1) / 2)); // Normalize to 0-1
                
                // Create a nice blue-to-white gradient
                const color = new THREE.Color().setHSL(
                    0.6, // Blue hue
                    0.3 + normalizedHeight * 0.4, // Saturation: 0.3 to 0.7
                    0.6 + normalizedHeight * 0.3  // Lightness: 0.6 to 0.9
                );
                
                colorArray[i] = color.r;
                colorArray[i + 1] = color.g;
                colorArray[i + 2] = color.b;
            }
            particleGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colorArray, 3));
        }
        
        const particleMaterial = new THREE.PointsMaterial({
            size: this.particleParams.particleSize,
            vertexColors: true,
            transparent: true,
            opacity: this.particleParams.particleOpacity,
            blending: THREE.AdditiveBlending,
            sizeAttenuation: false,
            depthWrite: false,
            depthTest: false
        });
        
        const particleSystem = new THREE.Points(particleGeometry, particleMaterial);
        particleSystem.layers.enable(1);
        
        return particleSystem;
    }
    
    applySolidModelParams(model) {
        const params = this.modelParams;
        
        model.scale.set(params.solidModelScale, params.solidModelScale, params.solidModelScale);
        model.position.set(params.solidModelPositionX, params.solidModelPositionY, params.solidModelPositionZ);
        model.rotation.set(
            THREE.MathUtils.degToRad(params.solidModelRotationX),
            THREE.MathUtils.degToRad(params.solidModelRotationY),
            THREE.MathUtils.degToRad(params.solidModelRotationZ)
        );
        
        if (params.useCustomColor) {
            const customColor = new THREE.Color(params.customColor);
            model.traverse((child) => {
                if (child.isMesh) {
                    child.material = child.material.clone();
                    child.material.color = customColor;
                }
            });
        }
    }
    
    delete() {
        // Allow deletion of default models for debugging purposes
        console.log(`Deleting model: ${this.name} (isDefault: ${this.isDefault})`);
        
        // Only prevent deletion if it's the last model and would leave the scene empty
        if (enhancedModelInstances.size <= 1) {
            console.warn('Cannot delete the last model - scene would be empty');
            return false;
        }
        
        if (this.particleSystem) {
            scene.remove(this.particleSystem);
            if (this.particleSystem.geometry) this.particleSystem.geometry.dispose();
            if (this.particleSystem.material) this.particleSystem.material.dispose();
        }
        
        if (this.solidModel) {
            scene.remove(this.solidModel);
            this.solidModel.traverse((child) => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(material => material.dispose());
                    } else {
                        child.material.dispose();
                    }
                }
            });
        }
        
        if (this.path && this.path.startsWith('blob:')) {
            URL.revokeObjectURL(this.path);
        }
        
        return true;
    }
}

// Global enhanced model instance manager
const enhancedModelInstances = new Map();
let activeModelInstance = null;


// Enhanced Model Instance Management Functions
function createEnhancedModelInstance(name, type, path, isDefault = false) {
    const instance = new ModelInstance(name, type, path, isDefault);
    enhancedModelInstances.set(instance.id, instance);
    console.log(`Created enhanced model instance: ${instance.name} (${instance.id})`);
    
    // Set as active if it's the first instance or if no active instance
    if (!activeModelInstance) {
        activeModelInstance = instance;
        console.log(`Setting ${instance.name} as active model instance`);
        updateCurrentModelDisplay();
        // Switch to particles view for the first model to maintain compatibility
        setTimeout(() => {
            console.log(`Switching ${instance.name} to particles view`);
            instance.switchView('particles');
        }, 100); // Small delay to ensure 3D model is created first
    }
    
    updateEnhancedModelsList();
    return instance;
}

function switchToModelInstance(id, viewMode) {
    const instance = enhancedModelInstances.get(id);
    if (!instance) return;
    
    // Hide current active instance
    if (activeModelInstance && activeModelInstance !== instance) {
        if (activeModelInstance.currentView === 'particles' && activeModelInstance.particleSystem) {
            scene.remove(activeModelInstance.particleSystem);
        } else if (activeModelInstance.currentView === '3d' && activeModelInstance.solidModel) {
            scene.remove(activeModelInstance.solidModel);
        }
    }
    
    activeModelInstance = instance;
    
    if (viewMode && viewMode !== instance.currentView) {
        instance.switchView(viewMode);
    } else {
        // Just activate current view
        if (instance.currentView === 'particles') {
            if (instance.particleSystem) {
                scene.add(instance.particleSystem);
                // Set global references for animation loop compatibility
                particleSystem = instance.particleSystem;
                particles = instance.particleSystem.geometry.attributes.position;
                
                // Initialize interaction arrays for particle effects
                const positions = particles.array;
                originalPositions = [...positions]; // Copy original positions
                velocities = new Float32Array(positions.length); // Initialize velocities to zero
                targetPositions = new Float32Array(positions.length); // Initialize target positions
            }
        } else {
            if (instance.solidModel) {
                scene.add(instance.solidModel);
            }
            // Clear global particle references when in 3D mode
            particleSystem = null;
            particles = null;
        }
        instance.updateGlobalParams();
    }
    
    updateEnhancedModelsList();
}

function deleteEnhancedModelInstance(id) {
    const instance = enhancedModelInstances.get(id);
    if (!instance || !instance.delete()) return false;
    
    if (activeModelInstance === instance) {
        activeModelInstance = null;
        // Switch to another instance if available
        const remainingInstances = Array.from(enhancedModelInstances.values());
        if (remainingInstances.length > 0) {
            switchToModelInstance(remainingInstances[0].id);
        }
    }
    
    enhancedModelInstances.delete(id);
    updateEnhancedModelsList();
    updateContextSensitiveUI();
    return true;
}


// Enhanced Models List UI
function updateEnhancedModelsList() {
    const container = document.getElementById('loaded-models-list');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (enhancedModelInstances.size === 0) {
        container.innerHTML = '<p style="color: #666; font-style: italic;">No models loaded</p>';
        return;
    }
    
    enhancedModelInstances.forEach((instance, id) => {
        const modelCard = document.createElement('div');
        modelCard.className = 'model-instance-card';
        modelCard.innerHTML = `
            <div class="model-header">
                <h4 class="model-name">${instance.name}${instance.isDefault ? ' (Site Default)' : ''}</h4>
                <span class="model-type">${instance.type.toUpperCase()}</span>
                <button class="delete-btn" onclick="deleteModelInstance('${id}')" title="Delete model">×</button>
            </div>
            
            <div class="model-versions">
                <div class="current-view">
                    <span class="current-view-label">Current View: ${instance.currentView === 'particles' ? '🔮 Particles' : '🎭 3D Model'}</span>
                    ${instance.currentView === 'particles' && instance.dreamyParticlesEnabled ? '<span class="dreamy-indicator">✨ Dreamy</span>' : ''}
                </div>
                
                <div class="view-controls">
                    <button class="view-btn ${instance.currentView === 'particles' ? 'active' : ''}" 
                            onclick="switchToModelInstance('${id}', 'particles')">
                        🔮 View as Particles
                    </button>
                    <button class="view-btn ${instance.currentView === '3d' ? 'active' : ''}" 
                            onclick="switchToModelInstance('${id}', '3d')">
                        🎭 View as 3D Model
                    </button>
                </div>
                
                <div class="instance-controls">
                    <button class="export-btn" onclick="exportInstanceParams('${id}')">📤 Export</button>
                </div>
                
                <div class="tweaked-status">
                    ${instance.currentView === 'particles' && instance.particleParamsTweaked ? '<span class="tweaked-indicator">✏️ Particle settings modified</span>' : ''}
                    ${instance.currentView === '3d' && instance.modelParamsTweaked ? '<span class="tweaked-indicator">✏️ 3D model settings modified</span>' : ''}
                </div>
            </div>
        `;
        
        container.appendChild(modelCard);
    });
}

// Global functions for UI callbacks
window.deleteModelInstance = deleteEnhancedModelInstance;
window.switchToModelInstance = switchToModelInstance;
window.exportInstanceParams = function(id) {
    const instance = enhancedModelInstances.get(id);
    if (instance) {
        instance.exportParams();
    }
};

// Initialize default model instance
function initializeDefaultModelInstances() {
    // Create single default PLY instance - ARTURO.ply is the main model for the site
    const defaultPLY = createEnhancedModelInstance('ARTURO.ply', 'ply', './ARTURO.ply', true);
    
    console.log('Default model instance initialized:', defaultPLY.name);
}

// Parameter change tracking
function trackParameterChange(paramName, value) {
    if (activeModelInstance) {
        activeModelInstance.updateParam(paramName, value);
        updateEnhancedModelsList();
    }
}

// Context-sensitive UI control visibility
function updateContextSensitiveUI() {
    if (!activeModelInstance) {
        // Hide all model-specific controls when no model is active
        const allControls = document.querySelectorAll('.control-group');
        allControls.forEach(container => {
            const label = container.querySelector('label');
            if (label && (label.textContent.includes('Size:') || 
                         label.textContent.includes('Opacity:') || 
                         label.textContent.includes('Density:') || 
                         label.textContent.includes('Scale:') || 
                         label.textContent.includes('Position') || 
                         label.textContent.includes('3D Model'))) {
                container.style.display = 'none';
            }
        });
        return;
    }
    
    const isParticleMode = activeModelInstance.currentView === 'particles';
    const isDreamyMode = activeModelInstance.dreamyParticlesEnabled;
    
    console.log(`Updating UI for ${activeModelInstance.name} - Mode: ${isParticleMode ? 'particles' : '3D'}, Dreamy: ${isDreamyMode}`);
    
    // Show/hide particle controls
    const particleControls = document.querySelectorAll('#particle-size, #particle-opacity, #particle-density, #scale-factor, #model-position-x, #model-position-y, #model-position-z, #model-rotation-x, #model-rotation-y, #model-rotation-z, #interaction-radius, #disperse-force, #rotation-speed, #easing-zone');
    particleControls.forEach(control => {
        const container = control.closest('.control-group');
        if (container) {
            container.style.display = isParticleMode ? 'block' : 'none';
        }
    });
    
    // Show/hide 3D model controls
    const modelControls = document.querySelectorAll('#solid-model-scale, #solid-model-position-x, #solid-model-position-y, #solid-model-position-z, #solid-model-rotation-x, #solid-model-rotation-y, #solid-model-rotation-z');
    modelControls.forEach(control => {
        const container = control.closest('.control-group');
        if (container) {
            container.style.display = !isParticleMode ? 'block' : 'none';
        }
    });
    
    // Show/hide particle effects checkbox only in particle mode
    const particleEffectsControl = document.getElementById('particle-effects-enabled');
    if (particleEffectsControl) {
        const container = particleEffectsControl.closest('.control-group');
        if (container) {
            container.style.display = isParticleMode ? 'block' : 'none';
        }
    }
    
    // Handle dreamy particles overrides
    if (isParticleMode && isDreamyMode) {
        const dreamyOverriddenControls = document.querySelectorAll('#particle-size, #particle-opacity, #disperse-force');
        dreamyOverriddenControls.forEach(control => {
            const container = control.closest('.control-group');
            if (container) {
                container.style.opacity = '0.5';
                container.style.pointerEvents = 'none';
                const label = container.querySelector('label');
                if (label && !label.textContent.includes('(Dreamy Override)')) {
                    label.innerHTML += ' <span style="color: #FFC107; font-size: 0.8em;">(Dreamy Override)</span>';
                }
            }
        });
    } else if (isParticleMode) {
        // Restore overridden controls when dreamy is disabled
        const dreamyOverriddenControls = document.querySelectorAll('#particle-size, #particle-opacity, #disperse-force');
        dreamyOverriddenControls.forEach(control => {
            const container = control.closest('.control-group');
            if (container) {
                container.style.opacity = '1';
                container.style.pointerEvents = 'auto';
                const label = container.querySelector('label');
                if (label) {
                    label.innerHTML = label.innerHTML.replace(/ <span[^>]*>\(Dreamy Override\)<\/span>/, '');
                }
            }
        });
    }
}


// Override the existing loadCustomModel function to use the new system
function loadCustomModelEnhanced(file, type) {
    console.log(`Loading custom model with enhanced system: ${file.name}, type: ${type}`);
    
    const url = URL.createObjectURL(file);
    const modelName = file.name;
    
    // Create new model instance (defaults to 3D view)
    const instance = createEnhancedModelInstance(modelName, type, url, false);
    
    // Switch to this new instance
    switchToModelInstance(instance.id);
    
    console.log(`Enhanced model loading complete for: ${modelName}`);
}

// Hook into the existing slider system to track parameter changes
function enhanceSliderTracking() {
    // Override the existing slider callback system
    const originalInitializeSliderWithNumber = window.initializeSliderWithNumber || initializeSliderWithNumber;
    
    window.initializeSliderWithNumber = function(baseId, paramKey, callback) {
        const wrappedCallback = function() {
            // Track the parameter change
            trackParameterChange(paramKey, debugParams[paramKey]);
            
            // Call original callback
            if (callback) {
                callback();
            }
        };
        
        // Call original function with wrapped callback
        return originalInitializeSliderWithNumber(baseId, paramKey, wrappedCallback);
    };
}

// Apple Liquid Glass Cursor Following Effect
function initializeCursorFollowing() {
    // Track mouse movement for liquid glass effects
    document.addEventListener('mousemove', (e) => {
        // Navigation cursor position
        const nav = document.querySelector('.main-nav');
        if (nav) {
            const rect = nav.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * 100;
            const y = ((e.clientY - rect.top) / rect.height) * 100;
            nav.style.setProperty('--mouse-x', `${x}%`);
            nav.style.setProperty('--mouse-y', `${y}%`);
        }
        
        // Portfolio items cursor position
        const portfolioItems = document.querySelectorAll('.portfolio-item');
        portfolioItems.forEach(item => {
            const rect = item.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * 100;
            const y = ((e.clientY - rect.top) / rect.height) * 100;
            item.style.setProperty('--mouse-x', `${x}%`);
            item.style.setProperty('--mouse-y', `${y}%`);
        });
        
        // Accessibility buttons cursor position
        const accessibilityBtns = document.querySelectorAll('.accessibility-btn');
        accessibilityBtns.forEach(btn => {
            const rect = btn.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * 100;
            const y = ((e.clientY - rect.top) / rect.height) * 100;
            btn.style.setProperty('--mouse-x', `${x}%`);
            btn.style.setProperty('--mouse-y', `${y}%`);
        });
    });
}

// Initialize the enhanced system
function initializeEnhancedModelSystem() {
    console.log('Initializing enhanced model management system...');
    
    // Initialize default model instances
    initializeDefaultModelInstances();
    
    // Initialize cursor following effects
    initializeCursorFollowing();
    
    // Enhance slider tracking
    enhanceSliderTracking();
    
    // Override the file loading system
    const originalFileHandler = document.getElementById('load-model');
    if (originalFileHandler) {
        // Reset event listeners
        const newFileHandler = originalFileHandler.cloneNode(true);
        originalFileHandler.parentNode.replaceChild(newFileHandler, originalFileHandler);
        
        // Add event listener
        newFileHandler.addEventListener('change', function(e) {
            const file = e.target.files[0];
            console.log('Enhanced file selected:', file ? file.name : 'none');
            
            if (file) {
                // Check if we're already loading to prevent infinite loops
                if (isLoading) {
                    console.log('Already loading, skipping enhanced auto-apply');
                    return;
                }
                
                const fileName = file.name.toLowerCase();
                let modelType;
                
                if (fileName.endsWith('.glb') || fileName.endsWith('.gltf')) {
                    modelType = 'glb';
                } else if (fileName.endsWith('.ply')) {
                    modelType = 'ply';
                } else if (fileName.endsWith('.obj')) {
                    modelType = 'obj';
                } else if (fileName.endsWith('.stl')) {
                    modelType = 'stl';
                } else {
                    alert('Unsupported file type. Please use .glb, .gltf, .ply, .obj, or .stl files.');
                    return;
                }
                
                console.log('Enhanced auto-detected model type:', modelType);
                loadCustomModelEnhanced(file, modelType);
                
                // Reset file input
                e.target.value = '';
            }
        });
    }
    
    console.log('Model management system initialized');
}


// Initialize mobile connect functionality
function initializeMobileConnect() {
    const connectBtn = document.getElementById('connect-btn');
    const socialGrid = document.querySelector('.social-grid');
    const mobileSocialGrid = document.querySelector('.mobile-social-grid');
    
    if (connectBtn) {
        connectBtn.addEventListener('click', function() {
            navigateToPage('connect');
            populateSocialGrid();
        });
    }
    
    // Populate mobile social grid on page load
    if (mobileSocialGrid) {
        populateMobileSocialGrid();
    }
    
    // Populate social grid with platform buttons
    function populateSocialGrid() {
        if (!socialGrid) return;
        
        const socialPlatforms = [
            // Match desktop order exactly: BlueSky, Discord, Email, Facebook, GitHub, Instagram, Ko-fi, LinkedIn, Patreon, TikTok, Twitch, X, YouTube
            {
                name: 'BlueSky',
                handle: '@arturojreal.bsky.social',
                url: 'https://bsky.app/profile/arturojreal.bsky.social',
                icon: `<svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><title>Bluesky</title><path d="M12 10.8c-1.087-2.114-4.046-6.053-6.798-7.995C2.566.944 1.561 1.266.902 1.565.139 1.908 0 3.08 0 3.768c0 .69.378 5.65.624 6.479.815 2.736 3.713 3.66 6.383 3.364.136-.02.275-.039.415-.056-.138.018-.276.037-.414.058-2.671-.297-5.569.628-6.383 3.364C.378 17.705 0 22.665 0 23.353c0 .688.139 1.86.902 2.202.659.299 1.664.621 4.3-1.24C7.954 22.373 10.913 18.434 12 16.32c1.087 2.114 4.046 6.053 6.798 7.995 2.636 1.861 3.641 1.539 4.3 1.24.763-.342.902-1.514.902-2.202 0-.688-.378-5.648-.624-6.477-.815-2.736-3.712-3.661-6.383-3.364-.138-.021-.276-.04-.414-.058.14.017.279.036.415.056 2.67.296 5.568-.628 6.383-3.364.246-.829.624-5.789.624-6.479 0-.688-.139-1.86-.902-2.202-.659-.299-1.664-.621-4.3 1.24C16.046 4.747 13.087 8.686 12 10.8Z"/></svg>`
            },
            {
                name: 'Discord',
                handle: 'Join my server',
                url: 'https://discord.gg/dsnZ9NFDsQ',
                icon: `<svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><title>Discord</title><path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419-.0190 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1568 2.4189Z"/></svg>`
            },
            {
                name: 'Email',
                handle: 'Email',
                url: 'mailto:arturojreal+contact@gmail.com',
                icon: `<svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><title>Mail</title><path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-.904.732-1.636 1.636-1.636h1.909L12 10.09l8.455-6.269h1.909c.904 0 1.636.732 1.636 1.636Z"/></svg>`
            },
            {
                name: 'YouTube',
                handle: '@arturojreal',
                url: 'https://youtube.com/@arturojreal',
                icon: `<svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><title>YouTube</title><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>`
            },
            {
                name: 'Instagram',
                handle: '@arturojreal',
                url: 'https://instagram.com/arturojreal',
                icon: `<svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><title>Instagram</title><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>`
            },
            {
                name: 'GitHub',
                handle: '@arturojreal',
                url: 'https://github.com/arturojreal',
                icon: `<svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><title>GitHub</title><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>`
            },
            {
                name: 'X (Twitter)',
                handle: '@arturojreal',
                url: 'https://x.com/arturojreal',
                icon: `<svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><title>X</title><path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z"/></svg>`
            },
            {
                name: 'Facebook',
                handle: '@arturojreal',
                url: 'https://facebook.com/arturojreal',
                icon: `<svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><title>Facebook</title><path d="M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647Z"/></svg>`
            },
            {
                name: 'Ko-fi',
                handle: '@arturojreal',
                url: 'https://ko-fi.com/arturojreal',
                icon: `<svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><title>Ko-fi</title><path d="M23.881 8.948c-.773-4.085-4.859-4.593-4.859-4.593H.723c-.604 0-.679.798-.679.798s-.082 7.324-.033 11.596c.049 4.271 3.759 4.825 3.759 4.825s8.665.456 13.888-.062c5.223-.519 6.807-3.505 6.807-3.505s.468-4.533-.584-9.059zM5.723 12.468c-.79.001-1.533.266-2.101.75-.568.484-.91 1.146-.967 1.875-.11 1.411.112 2.734.112 2.734.652-.648 1.49-1.018 2.378-1.05.888-.032 1.756.283 2.459.895.703.612 1.178 1.473 1.347 2.442.169.969-.044 1.979-.603 2.868.235.023.464.034.693.034.23 0 .459-.011.693-.034-.559-.889-.772-1.899-.603-2.868.169-.969.644-1.83 1.347-2.442.703-.612 1.571-.927 2.459-.895.888.032 1.726.402 2.378 1.05 0 0 .222-1.323.112-2.734-.057-.729-.399-1.391-.967-1.875a3.635 3.635 0 00-2.101-.75c-.846 0-1.664.311-2.31.878-.645.567-1.076 1.35-1.217 2.21-.141-.86-.572-1.643-1.217-2.21-.646-.567-1.464-.878-2.31-.878z"/></svg>`
            },
            {
                name: 'LinkedIn',
                handle: '@arturojreal',
                url: 'https://linkedin.com/in/arturojreal',
                icon: `<svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><title>LinkedIn</title><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>`
            },
            {
                name: 'Patreon',
                handle: '@arturojreal',
                url: 'https://patreon.com/arturojreal',
                icon: `<svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><title>Patreon</title><path d="M0 .48v23.04h4.22V.48zm15.385 0c-4.764 0-8.641 3.88-8.641 8.65 0 4.755 3.877 8.623 8.641 8.623 4.75 0 8.615-3.868 8.615-8.623C24 4.36 20.136.48 15.385.48z"/></svg>`
            },
            {
                name: 'TikTok',
                handle: '@arturojreal',
                url: 'https://tiktok.com/@arturojreal',
                icon: `<svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><title>TikTok</title><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>`
            },
            {
                name: 'Twitch',
                handle: '@arturojreal',
                url: 'https://twitch.tv/arturojreal',
                icon: `<svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><title>Twitch</title><path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z"/></svg>`
            }
        ];
        
        socialGrid.innerHTML = socialPlatforms.map(platform => `
            <a href="${platform.url}" target="_blank" rel="noopener noreferrer" class="social-platform-btn">
                <div class="social-icon">${platform.icon}</div>
                <div class="platform-info">
                    <div class="platform-name">${platform.name}</div>
                    <div class="platform-handle">${platform.handle}</div>
                </div>
            </a>
        `).join('');
    }
    
    // Populate mobile social grid with platform buttons
    function populateMobileSocialGrid() {
        if (!mobileSocialGrid) return;
        
        const socialPlatforms = [
            // Same platforms as desktop/connect page
            {
                name: 'BlueSky',
                handle: '@arturojreal.bsky.social',
                url: 'https://bsky.app/profile/arturojreal.bsky.social',
                icon: `<svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><title>Bluesky</title><path d="M12 10.8c-1.087-2.114-4.046-6.053-6.798-7.995C2.566.944 1.561 1.266.902 1.565.139 1.908 0 3.08 0 3.768c0 .69.378 5.65.624 6.479.815 2.736 3.713 3.66 6.383 3.364.136-.02.275-.039.415-.056-.138.018-.276.037-.414.058-2.671-.297-5.569.628-6.383 3.364C.378 17.705 0 22.665 0 23.353c0 .688.139 1.86.902 2.202.659.299 1.664.621 4.3-1.24C7.954 22.373 10.913 18.434 12 16.32c1.087 2.114 4.046 6.053 6.798 7.995 2.636 1.861 3.641 1.539 4.3 1.24.763-.342.902-1.514.902-2.202 0-.688-.378-5.648-.624-6.477-.815-2.736-3.712-3.661-6.383-3.364-.138-.021-.276-.04-.414-.058.14.017.279.036.415.056 2.67.296 5.568-.628 6.383-3.364.246-.829.624-5.789.624-6.479 0-.688-.139-1.86-.902-2.202-.659-.299-1.664-.621-4.3 1.24C16.046 4.747 13.087 8.686 12 10.8Z"/></svg>`
            },
            {
                name: 'Discord',
                handle: 'Join my server',
                url: 'https://discord.gg/dsnZ9NFDsQ',
                icon: `<svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><title>Discord</title><path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419-.0190 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1568 2.4189Z"/></svg>`
            },
            {
                name: 'Email',
                handle: 'Email',
                url: 'mailto:arturojreal+contact@gmail.com',
                icon: `<svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><title>Mail</title><path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-.904.732-1.636 1.636-1.636h1.909L12 10.09l8.455-6.269h1.909c.904 0 1.636.732 1.636 1.636Z"/></svg>`
            },
            {
                name: 'YouTube',
                handle: '@arturojreal',
                url: 'https://youtube.com/@arturojreal',
                icon: `<svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><title>YouTube</title><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>`
            },
            {
                name: 'Instagram',
                handle: '@arturojreal',
                url: 'https://instagram.com/arturojreal',
                icon: `<svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><title>Instagram</title><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>`
            },
            {
                name: 'GitHub',
                handle: '@arturojreal',
                url: 'https://github.com/arturojreal',
                icon: `<svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><title>GitHub</title><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>`
            },
            {
                name: 'X (Twitter)',
                handle: '@arturojreal',
                url: 'https://x.com/arturojreal',
                icon: `<svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><title>X</title><path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z"/></svg>`
            },
            {
                name: 'Facebook',
                handle: '@arturojreal',
                url: 'https://facebook.com/arturojreal',
                icon: `<svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><title>Facebook</title><path d="M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647Z"/></svg>`
            },
            {
                name: 'Ko-fi',
                handle: 'Support me',
                url: 'https://ko-fi.com/arturojreal',
                icon: `<svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><title>Ko-fi</title><path d="M23.881 8.948c-.773-4.085-4.859-4.593-4.859-4.593H.723c-.604 0-.679.798-.679.798s-.082 7.324-.033 11.596c.049 4.271 3.759 4.825 3.759 4.825s8.665.456 13.888-.062c5.223-.519 6.807-3.505 6.807-3.505s.468-4.533-.584-9.059zM5.723 12.468c-.79.001-1.533.266-2.101.75-.568.484-.91 1.146-.967 1.875-.11 1.411.112 2.734.112 2.734.652-.648 1.49-1.018 2.378-1.05.888-.032 1.756.283 2.459.895.703.612 1.178 1.473 1.347 2.442.169.969-.044 1.979-.603 2.868.235.023.464.034.693.034.23 0 .459-.011.693-.034-.559-.889-.772-1.899-.603-2.868.169-.969.644-1.83 1.347-2.442.703-.612 1.571-.927 2.459-.895.888.032 1.726.402 2.378 1.05 0 0 .222-1.323.112-2.734-.057-.729-.399-1.391-.967-1.875a3.635 3.635 0 00-2.101-.75c-.846 0-1.664.311-2.31.878-.645.567-1.076 1.35-1.217 2.21-.141-.86-.572-1.643-1.217-2.21-.646-.567-1.464-.878-2.31-.878z"/></svg>`
            },
            {
                name: 'LinkedIn',
                handle: '@arturojreal',
                url: 'https://linkedin.com/in/arturojreal',
                icon: `<svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><title>LinkedIn</title><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>`
            },
            {
                name: 'Patreon',
                handle: 'Support me',
                url: 'https://patreon.com/arturojreal',
                icon: `<svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><title>Patreon</title><path d="M0 .48v23.04h4.22V.48zm15.385 0c-4.764 0-8.641 3.88-8.641 8.65 0 4.755 3.877 8.623 8.641 8.623 4.75 0 8.615-3.868 8.615-8.623C24 4.36 20.136.48 15.385.48z"/></svg>`
            },
            {
                name: 'TikTok',
                handle: '@arturojreal',
                url: 'https://tiktok.com/@arturojreal',
                icon: `<svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><title>TikTok</title><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>`
            },
            {
                name: 'Twitch',
                handle: '@arturojreal',
                url: 'https://twitch.tv/arturojreal',
                icon: `<svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><title>Twitch</title><path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z"/></svg>`
            }
        ];
        
        mobileSocialGrid.innerHTML = socialPlatforms.map(platform => `
            <a href="${platform.url}" target="_blank" rel="noopener noreferrer" aria-label="${platform.name}" class="social-link">
                ${platform.icon}
            </a>
        `).join('');
    }
}

// Initialize mobile connect when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeMobileConnect);
} else {
    initializeMobileConnect();
}

