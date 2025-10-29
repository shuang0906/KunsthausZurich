
export function saveCurrentSVG(target = 'svg', filename = 'logo.svg', includeBG = true) {
    const svgEl = typeof target === 'string' ? document.querySelector(target) : target;
    if (!svgEl) { console.warn('SVG not found'); return; }

    // Clone so we can tweak attributes safely
    const svg = svgEl.cloneNode(true);
    const ns = 'http://www.w3.org/2000/svg';
    svg.setAttribute('xmlns', ns);
    if (!svg.getAttribute('xmlns:xlink')) svg.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');

    // Ensure width/height + viewBox are present
    let w = parseFloat(svg.getAttribute('width'));
    let h = parseFloat(svg.getAttribute('height'));
    if (!w || !h) {
        const r = svgEl.getBoundingClientRect();
        w = Math.max(1, Math.round(r.width));
        h = Math.max(1, Math.round(r.height));
        svg.setAttribute('width', w);
        svg.setAttribute('height', h);
    }

    if (includeBG) {
        const bgColor = getComputedStyle(document.body).backgroundColor || '#000'; // or your scene bg
        const rect = document.createElementNS(ns, 'rect');
        rect.setAttribute('x', -String(w)) / 2; rect.setAttribute('y', -String(h) / 2);
        rect.setAttribute('width', String(w));
        rect.setAttribute('height', String(h));
        rect.setAttribute('fill', bgColor);
        svg.insertBefore(rect, svg.firstChild);
    }

    // Serialize & download
    const xml = new XMLSerializer().serializeToString(svg);
    const data = `<?xml version="1.0" encoding="UTF-8"?>\n${xml}`;
    const blob = new Blob([data], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}


export async function startCanvasRecording(renderer, { seconds = 2, fps = 60, filename = 'capture.webm' } = {}) {
    // Must be a WebGL canvas (SVGRenderer won't work with captureStream)

    const canvas = renderer.domElement;
    if (!canvas.captureStream) {
        console.warn('captureStream() not supported by this browser.');
        return;
    }

    const stream = canvas.captureStream(fps);

    // Pick the best supported MIME type
    const pickType = (...types) => types.find(t => MediaRecorder.isTypeSupported(t));
    const mimeType =
        pickType('video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm') ||
        (navigator.userAgent.includes('Safari') ? 'video/mp4' : '');

    let recorder;
    try {
        recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    } catch (e) {
        console.warn('Failed to create MediaRecorder:', e);
        return;
    }

    const chunks = [];
    recorder.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };

    const stopped = new Promise(resolve => (recorder.onstop = resolve));

    recorder.start(); // start capturing
    setTimeout(() => { try { recorder.stop(); } catch (_) { } }, (seconds + 0.15) * 1000);

    await stopped;

    const blob = new Blob(chunks, { type: mimeType || 'video/webm' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

