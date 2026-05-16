// Portable Debug Panel for Three.js particle systems
// Usage: import { initDebugPanel } from './debug/panel.js';

const PANEL_TEMPLATE = `
<div id="particle-debug" class="debug-panel resizable hidden">
    <div class="debug-header">
        <h3>🎛️ Debug Controls</h3>
        <div class="header-controls">
            <button id="debug-minimize" class="debug-minimize">−</button>
            <button id="debug-close" class="debug-close">×</button>
        </div>
    </div>
    <div class="resize-handle"></div>
    <div class="debug-content">
        <h3>📁 3D Model Loading</h3>
        <div class="control-group">
            <label>Currently Active:</label>
            <div class="control-input-group">
                <span id="current-model-display" class="model-display">ARTURO.ply (Default)</span>
            </div>
        </div>
        <div class="control-group">
            <label for="load-model">Load New Model:</label>
            <div class="control-input-group">
                <input type="file" id="load-model" accept=".glb,.gltf,.ply,.obj,.stl" />
                <button id="apply-model" class="apply-btn" disabled>Apply Model</button>
            </div>
        </div>

        <h3>📋 Loaded Models</h3>
        <div id="loaded-models-list" class="models-list"></div>

        <h3>⚙️ Particle System</h3>
        <div class="control-group">
            <label><input type="checkbox" id="particle-effects-enabled" checked> Enable Particle Effects</label>
        </div>

        <h4>🎨 Visual Properties</h4>
        <div class="control-group">
            <label for="particle-size">Size:</label>
            <div class="control-input-group">
                <input type="range" id="particle-size" min="0.001" max="5.0" step="0.001" value="1.201">
                <input type="number" id="particle-size-num" min="0.001" max="5.0" step="0.001" value="1.201">
            </div>
        </div>
        <div class="control-group">
            <label for="particle-density">Density:</label>
            <div class="control-input-group">
                <input type="range" id="particle-density" min="500" max="100000" step="500" value="85000">
                <input type="number" id="particle-density-num" min="500" max="100000" step="500" value="85000">
            </div>
        </div>
        <div class="control-group">
            <label for="particle-color">Color:</label>
            <div class="control-input-group">
                <input type="color" id="particle-color" value="#ffffff">
                <input type="text" id="particle-color-hex" placeholder="#ffffff" maxlength="7">
            </div>
        </div>
        <div class="control-group">
            <label for="particle-opacity">Opacity:</label>
            <div class="control-input-group">
                <input type="range" id="particle-opacity" min="0.01" max="1.0" step="0.01" value="0.25">
                <input type="number" id="particle-opacity-num" min="0.01" max="1.0" step="0.01" value="0.25">
            </div>
        </div>

        <h4>🎯 Touch & Interaction</h4>
        <div class="control-group">
            <label><input type="checkbox" id="show-touch-radius"> Show Touch Radius</label>
        </div>
        <div class="control-group">
            <label for="interaction-radius">Touch Radius:</label>
            <div class="control-input-group">
                <input type="range" id="interaction-radius" min="0.1" max="20.0" step="0.1" value="13.5">
                <input type="number" id="interaction-radius-num" min="0.1" max="20.0" step="0.1" value="13.5">
            </div>
        </div>
        <div class="control-group">
            <label for="disperse-force">Disperse Force:</label>
            <div class="control-input-group">
                <input type="range" id="disperse-force" min="0.01" max="5.0" step="0.01" value="1.38">
                <input type="number" id="disperse-force-num" min="0.01" max="5.0" step="0.01" value="1.38">
            </div>
        </div>
        <div class="control-group">
            <label for="scale-factor">Scale:</label>
            <div class="control-input-group">
                <input type="range" id="scale-factor" min="0.1" max="50" step="0.1" value="16.7">
                <input type="number" id="scale-factor-num" min="0.1" max="50" step="0.1" value="16.7">
            </div>
        </div>
        <div class="control-group">
            <label for="model-position-x">Position X:</label>
            <div class="control-input-group">
                <input type="range" id="model-position-x" min="-10" max="10" step="0.1" value="0">
                <input type="number" id="model-position-x-num" min="-10" max="10" step="0.1" value="0">
            </div>
        </div>
        <div class="control-group">
            <label for="model-position-y">Position Y:</label>
            <div class="control-input-group">
                <input type="range" id="model-position-y" min="-10" max="10" step="0.1" value="0">
                <input type="number" id="model-position-y-num" min="-10" max="10" step="0.1" value="0">
            </div>
        </div>
        <div class="control-group">
            <label for="model-position-z">Position Z:</label>
            <div class="control-input-group">
                <input type="range" id="model-position-z" min="-10" max="10" step="0.1" value="0">
                <input type="number" id="model-position-z-num" min="-10" max="10" step="0.1" value="0">
            </div>
        </div>

        <div class="control-group">
            <label for="model-rotation-x">Particle Rotation X:</label>
            <div class="control-input-group">
                <input type="range" id="model-rotation-x" min="-180" max="180" step="5" value="0">
                <input type="number" id="model-rotation-x-num" min="-180" max="180" step="5" value="0">
            </div>
        </div>
        <div class="control-group">
            <label for="model-rotation-y">Particle Rotation Y:</label>
            <div class="control-input-group">
                <input type="range" id="model-rotation-y" min="-180" max="180" step="5" value="0">
                <input type="number" id="model-rotation-y-num" min="-180" max="180" step="5" value="0">
            </div>
        </div>
        <div class="control-group">
            <label for="model-rotation-z">Particle Rotation Z:</label>
            <div class="control-input-group">
                <input type="range" id="model-rotation-z" min="-180" max="180" step="5" value="0">
                <input type="number" id="model-rotation-z-num" min="-180" max="180" step="5" value="0">
            </div>
        </div>

        <h3>🎭 3D Model Controls</h3>
        <div class="control-group">
            <label for="solid-model-scale">3D Model Scale:</label>
            <div class="control-input-group">
                <input type="range" id="solid-model-scale" min="0.1" max="5" step="0.1" value="1">
                <input type="number" id="solid-model-scale-num" min="0.1" max="5" step="0.1" value="1">
            </div>
        </div>
        <div class="control-group">
            <label for="solid-model-position-x">3D Model Position X:</label>
            <div class="control-input-group">
                <input type="range" id="solid-model-position-x" min="-10" max="10" step="0.1" value="0">
                <input type="number" id="solid-model-position-x-num" min="-10" max="10" step="0.1" value="0">
            </div>
        </div>
        <div class="control-group">
            <label for="solid-model-position-y">3D Model Position Y:</label>
            <div class="control-input-group">
                <input type="range" id="solid-model-position-y" min="-10" max="10" step="0.1" value="0">
                <input type="number" id="solid-model-position-y-num" min="-10" max="10" step="0.1" value="0">
            </div>
        </div>
        <div class="control-group">
            <label for="solid-model-position-z">3D Model Position Z:</label>
            <div class="control-input-group">
                <input type="range" id="solid-model-position-z" min="-10" max="10" step="0.1" value="0">
                <input type="number" id="solid-model-position-z-num" min="-10" max="10" step="0.1" value="0">
            </div>
        </div>
        <div class="control-group">
            <label for="solid-model-rotation-x">3D Model Rotation X:</label>
            <div class="control-input-group">
                <input type="range" id="solid-model-rotation-x" min="-180" max="180" step="5" value="0">
                <input type="number" id="solid-model-rotation-x-num" min="-180" max="180" step="5" value="0">
            </div>
        </div>
        <div class="control-group">
            <label for="solid-model-rotation-y">3D Model Rotation Y:</label>
            <div class="control-input-group">
                <input type="range" id="solid-model-rotation-y" min="-180" max="180" step="5" value="0">
                <input type="number" id="solid-model-rotation-y-num" min="-180" max="180" step="5" value="0">
            </div>
        </div>
        <div class="control-group">
            <label for="solid-model-rotation-z">3D Model Rotation Z:</label>
            <div class="control-input-group">
                <input type="range" id="solid-model-rotation-z" min="-180" max="180" step="5" value="0">
                <input type="number" id="solid-model-rotation-z-num" min="-180" max="180" step="5" value="0">
            </div>
        </div>

        <h3>🎨 Color Controls</h3>
        <div class="control-group">
            <label for="custom-color">Model Color Override:</label>
            <div class="control-input-group">
                <input type="color" id="custom-color" value="#ffffff">
                <input type="text" id="custom-color-hex" placeholder="#ffffff" maxlength="7">
            </div>
        </div>
        <div class="control-group">
            <label><input type="checkbox" id="use-custom-color" checked> Use Custom Color</label>
        </div>

        <h3>🔄 Animation</h3>
        <div class="control-group">
            <label for="rotation-speed">Rotation Speed:</label>
            <div class="control-input-group">
                <input type="range" id="rotation-speed" min="0.001" max="0.02" step="0.001" value="0.002">
                <input type="number" id="rotation-speed-num" min="0.001" max="0.02" step="0.001" value="0.002">
            </div>
        </div>
        <div class="control-group">
            <label for="easing-zone">Easing Zone:</label>
            <div class="control-input-group">
                <input type="range" id="easing-zone" min="0.05" max="0.5" step="0.05" value="0.45">
                <input type="number" id="easing-zone-num" min="0.05" max="0.5" step="0.05" value="0.45">
            </div>
        </div>
        <div class="control-group">
            <label for="rotation-min">Rotation Min (degrees):</label>
            <div class="control-input-group">
                <input type="range" id="rotation-min" min="-180" max="0" step="5" value="-10">
                <input type="number" id="rotation-min-num" min="-180" max="0" step="5" value="-10">
            </div>
        </div>
        <div class="control-group">
            <label for="rotation-max">Rotation Max (degrees):</label>
            <div class="control-input-group">
                <input type="range" id="rotation-max" min="0" max="180" step="5" value="70">
                <input type="number" id="rotation-max-num" min="0" max="180" step="5" value="70">
            </div>
        </div>
        <div class="control-group">
            <label for="tone-mapping-exposure">Tone Mapping Exposure:</label>
            <div class="control-input-group">
                <input type="range" id="tone-mapping-exposure" min="0.1" max="2.0" step="0.01" value="0.74">
                <input type="number" id="tone-mapping-exposure-num" min="0.1" max="2.0" step="0.01" value="0.74">
            </div>
        </div>
        <div class="control-group">
            <label for="background-color">Background Color:</label>
            <div class="control-input-group">
                <input type="color" id="background-color" value="#0a0a0a">
                <input type="text" id="background-color-hex" placeholder="#0a0a0a" maxlength="7">
            </div>
        </div>

        <h3>🎨 Text Colors</h3>
        <div class="control-group">
            <label for="primary-text-color">Primary Text (Titles):</label>
            <div class="control-input-group">
                <input type="color" id="primary-text-color" value="#fffffc">
                <input type="text" id="primary-text-color-hex" placeholder="#fffffc" maxlength="7">
            </div>
        </div>
        <div class="control-group">
            <label for="secondary-text-color">Secondary Text:</label>
            <div class="control-input-group">
                <input type="color" id="secondary-text-color" value="#cccccc">
                <input type="text" id="secondary-text-color-hex" placeholder="#cccccc" maxlength="7">
            </div>
        </div>
        <div class="control-group">
            <label for="accent-text-color">Accent Text:</label>
            <div class="control-input-group">
                <input type="color" id="accent-text-color" value="#d8aa5a">
                <input type="text" id="accent-text-color-hex" placeholder="#d8aa5a" maxlength="7">
            </div>
        </div>

        <h3>💫 Bloom Effects</h3>
        <div class="control-group">
            <label><input type="checkbox" id="bloom-enabled" checked> Enable Bloom</label>
        </div>
        <div class="control-group">
            <label for="bloom-threshold">Threshold:</label>
            <div class="control-input-group">
                <input type="range" id="bloom-threshold" min="0" max="1" step="0.01" value="0.2">
                <input type="number" id="bloom-threshold-num" min="0" max="1" step="0.01" value="0.2">
            </div>
        </div>
        <div class="control-group">
            <label for="bloom-strength">Strength:</label>
            <div class="control-input-group">
                <input type="range" id="bloom-strength" min="0" max="3" step="0.01" value="0.3">
                <input type="number" id="bloom-strength-num" min="0" max="3" step="0.01" value="0.3">
            </div>
        </div>
        <div class="control-group">
            <label for="bloom-radius">Radius:</label>
            <div class="control-input-group">
                <input type="range" id="bloom-radius" min="0" max="1" step="0.01" value="0.15">
                <input type="number" id="bloom-radius-num" min="0" max="1" step="0.01" value="0.15">
            </div>
        </div>
        <div class="control-group">
            <label for="bloom-direction-x">Direction X:</label>
            <div class="control-input-group">
                <input type="range" id="bloom-direction-x" min="0.0" max="1.0" step="0.01" value="0.97">
                <input type="number" id="bloom-direction-x-num" min="0.0" max="1.0" step="0.01" value="0.97">
            </div>
        </div>
        <div class="control-group">
            <label for="bloom-direction-y">Direction Y:</label>
            <div class="control-input-group">
                <input type="range" id="bloom-direction-y" min="0.0" max="1.0" step="0.01" value="0.18">
                <input type="number" id="bloom-direction-y-num" min="0.0" max="1.0" step="0.01" value="0.18">
            </div>
        </div>

        <h3>⚙️ Actions</h3>
        <button id="export-params" class="export-btn">Export Parameters</button>
        <button id="reset-params" class="reset-btn">Reset to Defaults</button>
        <button id="clear-models" class="clear-btn">Clear All Models</button>
    </div>
</div>`;

function injectCSS(basePath) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `${basePath}/panel.css`;
    document.head.appendChild(link);
}

function initSlider(baseId, paramKey, ctx, callback) {
    const slider = document.getElementById(baseId);
    const num = document.getElementById(baseId + '-num');
    if (!slider || !num) return;

    slider.addEventListener('input', (e) => {
        if (ctx.isLoading()) return;
        const val = parseFloat(e.target.value);
        ctx.params[paramKey] = val;
        num.value = val;
        callback?.();
    });

    num.addEventListener('input', (e) => {
        if (ctx.isLoading()) return;
        const val = Math.max(parseFloat(slider.min), Math.min(parseFloat(slider.max), parseFloat(e.target.value)));
        ctx.params[paramKey] = val;
        slider.value = val;
        num.value = val;
        callback?.();
    });
}

function bindColorPair(pickerId, hexId, paramKey, ctx, callback) {
    const picker = document.getElementById(pickerId);
    const hex = document.getElementById(hexId);

    if (picker) {
        picker.addEventListener('input', (e) => {
            ctx.params[paramKey] = e.target.value;
            if (hex) hex.value = e.target.value;
            if (ctx.activeModel()) ctx.activeModel().updateParam(paramKey, e.target.value);
            callback?.();
        });
    }

    if (hex) {
        hex.addEventListener('input', (e) => {
            const v = e.target.value;
            if (v.startsWith('#') && (v.length === 7 || v.length === 4)) {
                ctx.params[paramKey] = v;
                if (picker) picker.value = v;
                if (ctx.activeModel()) ctx.activeModel().updateParam(paramKey, v);
                callback?.();
            }
        });
    }
}

function syncParamToModel(paramKey, ctx) {
    if (ctx.activeModel()) ctx.activeModel().updateParam(paramKey, ctx.params[paramKey]);
}

function updateModelsList(ctx) {
    const list = document.getElementById('loaded-models-list');
    if (!list) return;
    list.innerHTML = '';

    const models = ctx.getLoadedModels();
    models.glb.forEach((m, i) => list.appendChild(createModelItem('glb', i, m, ctx)));
    models.ply.forEach((m, i) => list.appendChild(createModelItem('ply', i, m, ctx)));

    if (!models.glb.length && !models.ply.length) {
        list.innerHTML = '<div style="padding:20px;text-align:center;color:rgba(255,255,255,0.5)">No models loaded</div>';
    }
}

function createModelItem(type, index, model, ctx) {
    const item = document.createElement('div');
    item.className = 'model-item';

    const idx = ctx.getCurrentModelIndex();
    if (ctx.params.modelType === type && idx[type] === index) {
        item.classList.add('active');
    }

    let fileSize = '';
    if (model.file?.size) fileSize = ` • ${(model.file.size / 1024).toFixed(1)}KB`;

    item.innerHTML = `
        <div class="model-info">
            <div class="model-name">${type.toUpperCase()}: ${model.name}</div>
            <div class="model-details">${model.isDefault ? 'Default' : 'Custom'}${fileSize}</div>
        </div>
        <div class="model-actions">
            <button class="model-btn select-btn" data-type="${type}" data-index="${index}">Select</button>
            ${!model.isDefault ? `<button class="model-btn remove-btn" data-type="${type}" data-index="${index}">Remove</button>` : ''}
        </div>`;

    item.querySelector('.select-btn').addEventListener('click', () => ctx.selectModel(type, index));
    const removeBtn = item.querySelector('.remove-btn');
    if (removeBtn) removeBtn.addEventListener('click', () => ctx.removeModel(type, index));

    return item;
}

function updateCurrentModelDisplay(ctx) {
    const el = document.getElementById('current-model-display');
    const model = ctx.activeModel();
    if (el && model) {
        const view = model.currentView === 'particles' ? 'Particles' : '3D Model';
        el.textContent = `${model.name} (${model.type.toUpperCase()} - ${view})`;
    }
}

function syncUIFromParams(ctx) {
    const wasLoading = ctx.isLoading();
    ctx.setLoading(true);

    const controls = [
        'particle-size', 'particle-opacity', 'particle-density', 'scale-factor',
        'interaction-radius', 'disperse-force', 'rotation-speed', 'easing-zone',
        'model-rotation-x', 'model-rotation-y', 'model-rotation-z',
        'model-position-x', 'model-position-y', 'model-position-z',
        'solid-model-scale', 'solid-model-position-x', 'solid-model-position-y', 'solid-model-position-z',
        'solid-model-rotation-x', 'solid-model-rotation-y', 'solid-model-rotation-z'
    ];

    controls.forEach(id => {
        const slider = document.getElementById(id);
        const num = document.getElementById(id + '-num');
        const key = id.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
        if (slider && ctx.params[key] !== undefined) slider.value = ctx.params[key];
        if (num && ctx.params[key] !== undefined) num.value = ctx.params[key];
    });

    const fx = document.getElementById('particle-effects-enabled');
    if (fx) fx.checked = ctx.params.particleEffectsEnabled !== false;

    ctx.setLoading(wasLoading);
}

function exportParameters(ctx) {
    const models = ctx.getLoadedModels();
    const idx = ctx.getCurrentModelIndex();
    const current = models[ctx.params.modelType][idx[ctx.params.modelType]];

    const out = {
        particleSize: ctx.params.particleSize,
        particleOpacity: ctx.params.particleOpacity,
        particleDensity: ctx.params.particleDensity,
        scaleFactor: ctx.params.scaleFactor,
        interactionRadius: ctx.params.interactionRadius,
        disperseForce: ctx.params.disperseForce,
        rotationSpeed: ctx.params.rotationSpeed,
        easingZone: ctx.params.easingZone,
        rotationMinDegrees: ctx.params.rotationMinDegrees,
        rotationMaxDegrees: ctx.params.rotationMaxDegrees,
        bloomThreshold: ctx.params.bloomThreshold,
        bloomStrength: ctx.params.bloomStrength,
        bloomRadius: ctx.params.bloomRadius,
        bloomEnabled: ctx.params.bloomEnabled,
        bloomDirectionX: ctx.params.bloomDirectionX,
        bloomDirectionY: ctx.params.bloomDirectionY,
        modelType: ctx.params.modelType,
        modelRotationX: ctx.params.modelRotationX,
        modelRotationY: ctx.params.modelRotationY,
        modelRotationZ: ctx.params.modelRotationZ,
        modelPositionX: ctx.params.modelPositionX,
        modelPositionY: ctx.params.modelPositionY,
        modelPositionZ: ctx.params.modelPositionZ,
        solidModelScale: ctx.params.solidModelScale,
        solidModelPositionX: ctx.params.solidModelPositionX,
        solidModelPositionY: ctx.params.solidModelPositionY,
        solidModelPositionZ: ctx.params.solidModelPositionZ,
        solidModelRotationX: ctx.params.solidModelRotationX,
        solidModelRotationY: ctx.params.solidModelRotationY,
        solidModelRotationZ: ctx.params.solidModelRotationZ,
        customColor: ctx.params.customColor,
        useCustomColor: ctx.params.useCustomColor,
        particleColor: ctx.params.particleColor,
        particleEffectsEnabled: ctx.params.particleEffectsEnabled,
        showAsParticles: ctx.params.showAsParticles,
        showAs3DModel: ctx.params.showAs3DModel,
        enableDreamyParticles: ctx.params.enableDreamyParticles,
        toneMappingExposure: ctx.params.toneMappingExposure,
        particleForce: ctx.params.particleForce,
        particleMinAlpha: ctx.params.particleMinAlpha,
        particleMaxAlpha: ctx.params.particleMaxAlpha,
        currentModelName: current.name,
        currentModelPath: current.isDefault ? current.path : 'Custom file loaded',
        totalLoadedModels: { glb: models.glb.length, ply: models.ply.length }
    };

    console.log('=== PARTICLE PARAMETERS ===');
    console.log(JSON.stringify(out, null, 2));
    console.log('=== END PARAMETERS ===');

    navigator.clipboard?.writeText(JSON.stringify(out, null, 2))
        .then(() => console.log('Parameters copied to clipboard!'))
        .catch(() => {});

    alert('Parameters exported to console! Check the browser console (F12) for the JSON data.');
}

export function initDebugPanel(ctx, basePath = './debug') {
    injectCSS(basePath);
    document.body.insertAdjacentHTML('afterbegin', PANEL_TEMPLATE);

    const panel = document.getElementById('particle-debug');
    const closeBtn = document.getElementById('debug-close');
    const minimizeBtn = document.getElementById('debug-minimize');

    // D key toggle
    document.addEventListener('keydown', (e) => {
        if (e.key.toLowerCase() === 'd' && !e.ctrlKey && !e.metaKey && !e.altKey && !e.target.matches('input, textarea, select')) {
            e.preventDefault();
            panel.classList.toggle('hidden');
        }
    });

    // Triple-tap for mobile
    let tapCount = 0, tapTimer = null;
    document.addEventListener('touchend', () => {
        tapCount++;
        if (tapCount === 1) {
            tapTimer = setTimeout(() => { tapCount = 0; }, 500);
        } else if (tapCount === 3) {
            clearTimeout(tapTimer);
            tapCount = 0;
            const mobileNav = document.querySelector('.mobile-nav');
            const mobileSocial = document.querySelector('.mobile-social-container');
            const visible = !panel.classList.contains('hidden');

            if (visible) {
                panel.classList.add('hidden');
                if (mobileNav) mobileNav.style.display = 'flex';
                if (mobileSocial) mobileSocial.style.display = 'flex';
            } else {
                panel.classList.remove('hidden');
                panel.style.display = 'block';
                if (mobileNav) mobileNav.style.display = 'none';
                if (mobileSocial) mobileSocial.style.display = 'none';
            }
        }
    });

    if (closeBtn) closeBtn.addEventListener('click', () => panel.classList.add('hidden'));

    if (minimizeBtn) {
        minimizeBtn.addEventListener('click', () => {
            const content = panel.querySelector('.debug-content');
            if (content.style.display === 'none') {
                content.style.display = 'block';
                minimizeBtn.textContent = '−';
            } else {
                content.style.display = 'none';
                minimizeBtn.textContent = '+';
            }
            panel.style.height = 'auto';
        });
    }

    // Particle sliders
    const sliderDef = (id, key, cb) => initSlider(id, key, ctx, () => { syncParamToModel(key, ctx); cb?.(); });

    sliderDef('particle-size', 'particleSize', ctx.hooks.updateParticleSize);
    sliderDef('particle-opacity', 'particleOpacity', ctx.hooks.updateParticleOpacity);
    sliderDef('particle-density', 'particleDensity', ctx.hooks.reloadParticles);
    sliderDef('scale-factor', 'scaleFactor', ctx.hooks.reloadParticles);
    sliderDef('interaction-radius', 'interactionRadius');
    sliderDef('disperse-force', 'disperseForce');
    sliderDef('rotation-speed', 'rotationSpeed');
    sliderDef('easing-zone', 'easingZone');

    // 3D model transform sliders
    sliderDef('solid-model-scale', 'solidModelScale', ctx.hooks.updateSolidModelTransform);
    sliderDef('solid-model-position-x', 'solidModelPositionX', ctx.hooks.updateSolidModelTransform);
    sliderDef('solid-model-position-y', 'solidModelPositionY', ctx.hooks.updateSolidModelTransform);
    sliderDef('solid-model-position-z', 'solidModelPositionZ', ctx.hooks.updateSolidModelTransform);
    sliderDef('solid-model-rotation-x', 'solidModelRotationX', ctx.hooks.updateSolidModelTransform);
    sliderDef('solid-model-rotation-y', 'solidModelRotationY', ctx.hooks.updateSolidModelTransform);
    sliderDef('solid-model-rotation-z', 'solidModelRotationZ', ctx.hooks.updateSolidModelTransform);

    // Particle position/rotation
    const particleViewSlider = (id, key, cb) => initSlider(id, key, ctx, () => {
        const m = ctx.activeModel();
        if (m?.currentView === 'particles') { syncParamToModel(key, ctx); cb?.(); }
    });
    particleViewSlider('model-position-x', 'modelPositionX', ctx.hooks.updateParticlePosition);
    particleViewSlider('model-position-y', 'modelPositionY', ctx.hooks.updateParticlePosition);
    particleViewSlider('model-position-z', 'modelPositionZ', ctx.hooks.updateParticlePosition);
    particleViewSlider('model-rotation-x', 'modelRotationX', ctx.hooks.reloadParticles);
    particleViewSlider('model-rotation-y', 'modelRotationY', ctx.hooks.reloadParticles);
    particleViewSlider('model-rotation-z', 'modelRotationZ', ctx.hooks.reloadParticles);

    // Bloom
    sliderDef('bloom-threshold', 'bloomThreshold', ctx.hooks.updateBloomSettings);
    sliderDef('bloom-strength', 'bloomStrength', ctx.hooks.updateBloomSettings);
    sliderDef('bloom-radius', 'bloomRadius', ctx.hooks.updateBloomSettings);
    sliderDef('bloom-direction-x', 'bloomDirectionX', ctx.hooks.updateBloomSettings);
    sliderDef('bloom-direction-y', 'bloomDirectionY', ctx.hooks.updateBloomSettings);

    const bloomToggle = document.getElementById('bloom-enabled');
    if (bloomToggle) {
        bloomToggle.addEventListener('change', (e) => {
            ctx.params.bloomEnabled = e.target.checked;
            syncParamToModel('bloomEnabled', ctx);
            ctx.hooks.updateBloomSettings?.();
        });
    }

    // Tone mapping
    sliderDef('tone-mapping-exposure', 'toneMappingExposure', ctx.hooks.updateToneMappingExposure);

    // Background color
    bindColorPair('background-color', 'background-color-hex', 'backgroundColor', ctx, ctx.hooks.updateBackgroundColor);

    // Text colors
    bindColorPair('primary-text-color', 'primary-text-color-hex', 'primaryTextColor', ctx, ctx.hooks.updateTextColors);
    bindColorPair('secondary-text-color', 'secondary-text-color-hex', 'secondaryTextColor', ctx, ctx.hooks.updateTextColors);
    bindColorPair('accent-text-color', 'accent-text-color-hex', 'accentTextColor', ctx, ctx.hooks.updateTextColors);

    // Model color override
    const colorPicker = document.getElementById('custom-color');
    const colorHex = document.getElementById('custom-color-hex');
    const useCustom = document.getElementById('use-custom-color');

    if (colorPicker) {
        colorPicker.addEventListener('input', (e) => {
            ctx.params.customColor = e.target.value;
            if (colorHex) colorHex.value = e.target.value;
            if (ctx.params.useCustomColor) ctx.hooks.reloadParticles?.();
        });
    }
    if (colorHex) {
        colorHex.addEventListener('input', (e) => {
            const v = e.target.value;
            if (v.startsWith('#') && (v.length === 7 || v.length === 4)) {
                ctx.params.customColor = v;
                if (colorPicker) colorPicker.value = v;
                if (ctx.params.useCustomColor) ctx.hooks.reloadParticles?.();
            }
        });
    }
    if (useCustom) {
        useCustom.addEventListener('change', (e) => {
            ctx.params.useCustomColor = e.target.checked;
            ctx.hooks.reloadParticles?.();
        });
    }

    // Particle color
    const pPicker = document.getElementById('particle-color');
    const pHex = document.getElementById('particle-color-hex');
    if (pPicker) {
        pPicker.addEventListener('input', (e) => {
            ctx.params.particleColor = e.target.value;
            if (pHex) pHex.value = e.target.value;
            ctx.hooks.updateParticleColor?.();
        });
    }
    if (pHex) {
        pHex.addEventListener('input', (e) => {
            const v = e.target.value;
            if (v.startsWith('#') && (v.length === 7 || v.length === 4)) {
                ctx.params.particleColor = v;
                if (pPicker) pPicker.value = v;
                ctx.hooks.updateParticleColor?.();
            }
        });
    }

    // Touch radius toggle
    const touchToggle = document.getElementById('show-touch-radius');
    if (touchToggle) {
        touchToggle.addEventListener('change', (e) => ctx.setShowTouchRadius?.(e.target.checked));
    }

    // Particle effects toggle
    const fxToggle = document.getElementById('particle-effects-enabled');
    if (fxToggle) {
        fxToggle.addEventListener('change', (e) => {
            ctx.params.particleEffectsEnabled = e.target.checked;
            if (!e.target.checked) ctx.hooks.resetParticlePositions?.();
        });
    }

    // File input
    const fileInput = document.getElementById('load-model');
    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const ext = file.name.toLowerCase();
            let type;
            if (ext.endsWith('.glb') || ext.endsWith('.gltf')) type = 'glb';
            else if (ext.endsWith('.ply')) type = 'ply';
            else if (ext.endsWith('.obj')) type = 'obj';
            else if (ext.endsWith('.stl')) type = 'stl';
            else { alert('Unsupported file type.'); return; }

            ctx.hooks.loadCustomModel?.(file, type);
            e.target.value = '';
        });
    }

    // Action buttons
    document.getElementById('export-params')?.addEventListener('click', () => exportParameters(ctx));

    document.getElementById('reset-params')?.addEventListener('click', () => {
        const defaults = ctx.params.modelType === 'glb' ? ctx.glbDefaults : ctx.plyDefaults;
        Object.assign(ctx.params, { ...defaults });
        syncUIFromParams(ctx);
    });

    document.getElementById('clear-models')?.addEventListener('click', () => ctx.hooks.clearAllModels?.());

    // Initialize models list
    updateModelsList(ctx);

    // Expose refresh hooks for external callers
    return {
        updateModelsList: () => updateModelsList(ctx),
        updateCurrentModelDisplay: () => updateCurrentModelDisplay(ctx),
        syncUIFromParams: () => syncUIFromParams(ctx),
    };
}
