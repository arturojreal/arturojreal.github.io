# Debug Panel

Portable debug overlay for Three.js particle system projects. Provides real-time controls for particle size, density, color, bloom, tone mapping, model loading, and more.

## Files

- **panel.js** — ES module that injects DOM, loads CSS, and wires up all controls
- **panel.css** — Self-contained styles for the debug panel (desktop + mobile)

## Quick Start

1. Copy the `debug/` folder into your project root.

2. In your main JS, dynamically import and initialize:

```js
const DEBUG_MODE = true; // flip to false to disable

if (DEBUG_MODE) {
    const { initDebugPanel } = await import('./debug/panel.js');

    const debugUI = initDebugPanel({
        // Reference to your params object (mutated in place by the panel)
        params: debugParams,

        // Default parameter sets for reset functionality
        glbDefaults: glbDefaults,
        plyDefaults: plyDefaults,

        // State accessors
        isLoading: () => isLoading,
        setLoading: (v) => { isLoading = v; },
        activeModel: () => activeModelInstance,
        getLoadedModels: () => loadedModels,
        getCurrentModelIndex: () => currentModelIndex,
        selectModel: (type, index) => window.selectModel(type, index),
        removeModel: (type, index) => window.removeModel(type, index),
        setShowTouchRadius: (v) => {
            showTouchRadius = v;
            if (touchRadiusIndicator) touchRadiusIndicator.visible = v;
        },

        // Callback hooks — wire these to your app's update functions
        hooks: {
            updateParticleSize,
            updateParticleOpacity,
            updateParticleColor,
            updateParticlePosition,
            updateBloomSettings,
            updateToneMappingExposure,
            updateBackgroundColor,
            updateTextColors,
            updateSolidModelTransform,
            reloadParticles,
            loadCustomModel: loadCustomModelEnhanced,
            clearAllModels,
            resetParticlePositions: () => {
                if (particleSystem && originalPositions) {
                    const pos = particleSystem.geometry.attributes.position;
                    for (let i = 0; i < originalPositions.length; i++) pos.array[i] = originalPositions[i];
                    pos.needsUpdate = true;
                }
            },
        },
    });
```

3. The panel returns an object with refresh methods you can call after model changes:

```js
debugUI.updateModelsList();
debugUI.updateCurrentModelDisplay();
debugUI.syncUIFromParams();
```

## Controls

- **D key** — Toggle panel visibility (desktop)
- **Triple-tap** — Toggle panel visibility (mobile)
- Particle size, density, opacity, color
- Model position/rotation (particles and solid)
- Bloom threshold, strength, radius, direction
- Tone mapping exposure
- Background & text colors
- Model file loading (.glb, .gltf, .ply, .obj, .stl)
- Export parameters to clipboard / console

## Customization

Edit `panel.css` to restyle. Edit the `PANEL_TEMPLATE` string in `panel.js` to add/remove controls. The `basePath` parameter in `initDebugPanel(ctx, basePath)` defaults to `'./debug'` — change it if you place the files elsewhere.
