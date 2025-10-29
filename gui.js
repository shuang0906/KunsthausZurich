// gui.js
import { GUI } from 'https://unpkg.com/three@0.167.1/examples/jsm/libs/lil-gui.module.min.js';

const gui = new GUI({ closeFolders: true });
export const getGUI = () => gui;

export function addRendererUI({
    switchRenderer,
    defaultRenderer = 'SVG (SVG Output)'
}) {
    const viewUI = { Renderer: defaultRenderer };
    gui.add(viewUI, 'Renderer', ['WebGL (Video Output)', 'SVG (SVG Output)'])
        .name('Renderer')
        .onChange(switchRenderer);
    return gui;
}

export function addCameraUI({
    getCamera,
    setCamera,
    perspCamera,
    orthoCamera,
    controls,
    syncOrthoFrustum,
}) {
    const camUI = {
        Projection: getCamera() === perspCamera ? 'Perspective' : 'Orthographic'
    };

    gui.add(camUI, 'Projection', ['Perspective', 'Orthographic'])
        .name('Camera')
        .onChange(mode => {
            if (mode === 'Perspective') {
                perspCamera.position.copy(orthoCamera.position);
                perspCamera.quaternion.copy(orthoCamera.quaternion);
                setCamera(perspCamera);
            } else {
                syncOrthoFrustum();
                setCamera(orthoCamera);
            }
            controls.object = getCamera();
            controls.update();
        });

    return gui;
}

export function addBoxHelperUI({
    box,
    render,
}) {
    const ui = { showBoxHelper: true }; // default on
    gui.add(ui, 'showBoxHelper').name('Box Helper').onChange((v) => {
        if (box) box.visible = v;
        render();
    });

    return gui;
}

export function addColorUI({
    scene,
    box,                       // BoxHelper (optional: for updating stroke color)
    colorParams,                    // { bg, cStroke } — the same object your app uses
    setStrokeColor,            // (hex) => void — updates all tracked materials
}) {
    const colFolder = gui.addFolder('Color');
    colFolder.addColor(colorParams, 'bg').name('Background').onChange(v => scene.background.set(v));
    colFolder.addColor(colorParams, 'cStroke').name('Stroke').onChange(v => {
        box.material.color.set(v);
        setStrokeColor(v);
    });
    colFolder.open(false);

    return gui;
}

export function addStaticUI({
    rebuildStrips,
    boxParams,
    applyBoxSize,
    rotParams,
    applyRotation,
}) {
    const staticFolder = gui.addFolder('Static');

    staticFolder.add(boxParams, 'kStroke', 0.001, 1, 0.001).name('Stroke Width').onChange((val) => {
        rebuildStrips();
    });

    const staticBoxSize = staticFolder.addFolder('Box Size');
    const wCtrl = staticBoxSize.add(boxParams, 'width', 0, 10, 0.001).name('Width').onChange(applyBoxSize);
    const hCtrl = staticBoxSize.add(boxParams, 'height', 1, 10, 0.001).name('Height').onChange(applyBoxSize);
    const dCtrl = staticBoxSize.add(boxParams, 'depth', 1, 10, 0.001).name('Depth').onChange(applyBoxSize);
    staticFolder.open(false);

    const staticRotation = staticFolder.addFolder('Rotation (°)');

    // create controllers first
    const xCtrl = staticRotation.add(rotParams, 'x', -180, 180).name('X').onChange(applyRotation);
    const yCtrl = staticRotation.add(rotParams, 'y', -180, 180).name('Y').onChange(applyRotation);
    const zCtrl = staticRotation.add(rotParams, 'z', -180, 180).name('Z').onChange(applyRotation);

    [xCtrl, yCtrl, zCtrl].forEach(c => c.step(rotParams.step));

    staticRotation.add(rotParams, 'step', 0.01, 45, 0.01).name('Step').onChange((s) => {
        [xCtrl, yCtrl, zCtrl].forEach(c => c.step(s));
    });

    staticFolder.add({
        reset: () => {
            wCtrl.setValue(4);
            hCtrl.setValue(2);
            dCtrl.setValue(2);
            xCtrl.setValue(0);
            yCtrl.setValue(0);
            zCtrl.setValue(0);
        }
    }, 'reset').name('Reset');

    return gui;
}

export function addAnimationUI({
    rotParams,
    strokeParams,
    resetAnimStroke,
    widthParams,
    resetAnimBoxWidth,
    heightParams,
    resetAnimBoxHeight,
    animActions
}) {
    const animFolder = gui.addFolder('Animation');
    animFolder.open(false);

    const rotateFolder = animFolder.addFolder('Rotate');
    rotateFolder.add(rotParams, 'enabled').name('Animation');
    rotateFolder.add(rotParams, 'period', 0.1, 60, 0.01).name('Rotation Cycle (s)');

    const strokeFolder = animFolder.addFolder('Stroke');
    strokeFolder.add(strokeParams, 'auto').name('Animation').onChange(resetAnimStroke);
    strokeFolder.add(strokeParams, 'min', 0.001, 1, 0.001).name('Stroke Min').onChange(() => {
        if (strokeParams.min > strokeParams.max) [strokeParams.min, strokeParams.max] = [strokeParams.max, strokeParams.min];
    });
    strokeFolder.add(strokeParams, 'max', 0.001, 1, 0.001).name('Stroke Max').onChange(() => {
        if (strokeParams.min > strokeParams.max) [strokeParams.min, strokeParams.max] = [strokeParams.max, strokeParams.min];
    });
    strokeFolder.add(strokeParams, 'period', 0.1, 10, 0.01).name('Stroke Cycle (s)').onChange(resetAnimStroke);
    strokeFolder.add(strokeParams, 'delayPause', 0, 10, 0.01).name('Pause Delay (s)').onChange(resetAnimStroke);
    strokeFolder.add(strokeParams, 'delayStart', 0, 10, 0.01).name('Start Delay (s)').onChange(resetAnimStroke);

    const widthFolder = animFolder.addFolder('Box Width');
    widthFolder.add(widthParams, 'auto').name('Animation').onChange(resetAnimBoxWidth);
    widthFolder.add(widthParams, 'min', 1, 6, 0.01).name('Width Min').onChange(() => {
        if (widthParams.min > widthParams.max) [widthParams.min, widthParams.max] = [widthParams.max, widthParams.min];
    });
    widthFolder.add(widthParams, 'max', 1, 6, 0.01).name('Width Max').onChange(() => {
        if (widthParams.min > widthParams.max) [widthParams.min, widthParams.max] = [widthParams.max, widthParams.min];
    });
    widthFolder.add(widthParams, 'period', 0.1, 10, 0.01).name('Width Cycle (s)');
    widthFolder.add(widthParams, 'delayPause', 0, 10, 0.01).name('Pause Delay (s)').onChange(resetAnimBoxWidth);
    widthFolder.add(widthParams, 'delayStart', 0, 10, 0.01).name('Start Delay (s)').onChange(resetAnimBoxWidth);

    const heightFolder = animFolder.addFolder('Box Height');
    heightFolder.add(heightParams, 'auto').name('Animation').onChange(resetAnimBoxHeight);
    heightFolder.add(heightParams, 'min', 1, 6, 0.01).name('Height Min').onChange(() => {
        if (heightParams.min > heightParams.max) [heightParams.min, heightParams.max] = [heightParams.max, heightParams.min];
    });
    heightFolder.add(heightParams, 'max', 1, 6, 0.01).name('Height Max').onChange(() => {
        if (heightParams.min > heightParams.max) [heightParams.min, heightParams.max] = [heightParams.max, heightParams.min];
    });
    heightFolder.add(heightParams, 'period', 0.1, 10, 0.01).name('Height Cycle (s)').onChange(resetAnimBoxHeight);
    heightFolder.add(heightParams, 'delayPause', 0, 10, 0.01).name('Pause Delay (s)').onChange(resetAnimBoxHeight);
    heightFolder.add(heightParams, 'delayStart', 0, 10, 0.01).name('Start Delay (s)').onChange(resetAnimBoxHeight);

    animFolder.add(animActions, 'startAnimation').name('Start Animation');

    return gui;
}

export function addExportUI({
    svgParams,
    recParams,
    recordActions,
    comboActions,
}) {

    const exportFolder = gui.addFolder('Export');

    const SVGFolder = exportFolder.addFolder('SVG');
    SVGFolder.add(svgParams, 'filename').name('SVG Filename');
    SVGFolder.add(svgParams, 'background').name('SVG Background');
    const exportSvgCtrl = SVGFolder.add(svgParams, 'save').name('Save SVG');

    const videoFolder = exportFolder.addFolder('Video');
    videoFolder.add(recParams, 'seconds', 0.5, 30, 0.1).name('Record Seconds');
    videoFolder.add(recParams, 'fps', 1, 60, 1).name('Record FPS');
    videoFolder.add(recParams, 'filename').name('Record Filename');
    const exportVideoCtrl = videoFolder.add(recordActions, 'startRecord').name('Start Record');
    const exportVideoAnimCtrl = videoFolder.add(comboActions, 'startAnimRecord').name('Start Animation + Record');

    const isSVG = r => r?.domElement instanceof SVGElement;
    const isWebGL = r => r?.domElement instanceof HTMLCanvasElement;

    function updateExportButtons(renderer) {
        if (isWebGL(renderer)) {
            exportSvgCtrl.disable(); exportVideoCtrl.enable(); exportVideoAnimCtrl.enable();
        } else if (isSVG(renderer)) {
            exportSvgCtrl.enable(); exportVideoCtrl.disable(); exportVideoAnimCtrl.disable();
        }
    }

    function updateButtonsName(button) {
        console.log('Recording started...');
        exportVideoCtrl.disable(); 
        exportVideoAnimCtrl.disable();

        if (button === 'exportVideoCtrl'){
            exportVideoCtrl.name('Recording');
        } else if (button === 'exportVideoAnimCtrl'){
            exportVideoAnimCtrl.name('Recording');
        }

        setTimeout(() => {
            console.log('Recording finished.');
            exportVideoCtrl.name('Start Record');
            exportVideoAnimCtrl.name('Start Animation + Record');
            exportVideoCtrl.enable(); 
            exportVideoAnimCtrl.enable();
        }, (recParams.seconds + 0.1) * 1000);
    }

    return { gui, updateExportButtons, updateButtonsName };
}
