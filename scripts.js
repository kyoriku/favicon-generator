let currentSVG = '';

const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const svgInput = document.getElementById('svgInput');
const errorDiv = document.getElementById('error');
const previewSection = document.getElementById('previewSection');

dropZone.addEventListener('click', () => {
  fileInput.click();
});

['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
  dropZone.addEventListener(eventName, preventDefaults, false);
  document.body.addEventListener(eventName, preventDefaults, false);
});

function preventDefaults(e) {
  e.preventDefault();
  e.stopPropagation();
}

['dragenter', 'dragover'].forEach(eventName => {
  dropZone.addEventListener(eventName, () => {
    dropZone.classList.add('drag-over');
  }, false);
});

['dragleave', 'drop'].forEach(eventName => {
  dropZone.addEventListener(eventName, () => {
    dropZone.classList.remove('drag-over');
  }, false);
});

dropZone.addEventListener('drop', handleDrop, false);
fileInput.addEventListener('change', handleFileSelect, false);

function handleDrop(e) {
  const dt = e.dataTransfer;
  const files = dt.files;
  handleFiles(files);
}

function handleFileSelect(e) {
  const files = e.target.files;
  handleFiles(files);
}

function handleFiles(files) {
  if (files.length === 0) return;

  const file = files[0];

  if (!file.type.includes('svg') && !file.name.endsWith('.svg')) {
    showError('Please upload an SVG file');
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    const svgContent = e.target.result;
    svgInput.value = svgContent;
    hideError();
  };
  reader.readAsText(file);
}

function showError(message) {
  errorDiv.textContent = message;
  errorDiv.classList.add('active');
}

function hideError() {
  errorDiv.classList.remove('active');
}

function clearAll() {
  svgInput.value = '';
  fileInput.value = '';
  previewSection.classList.remove('active');
  hideError();
}

function validateSVG(svgString) {
  if (!svgString.trim()) {
    showError('Please provide SVG file or code');
    return false;
  }

  if (!svgString.includes('<svg')) {
    showError('Invalid SVG: Must contain <svg> tag');
    return false;
  }

  if (!svgString.includes('xmlns')) {
    svgString = svgString.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
  }

  currentSVG = svgString;
  return true;
}

function generateFavicons() {
  const svgString = svgInput.value;

  if (!validateSVG(svgString)) {
    return;
  }

  hideError();

  currentSVG = svgString;

  previewSection.classList.add('active');

  drawFavicon(document.getElementById('canvas16'), 16);
  drawFavicon(document.getElementById('canvas32'), 32);
  drawFavicon(document.getElementById('canvas64'), 64);
  drawFavicon(document.getElementById('canvas128'), 128);
  drawFavicon(document.getElementById('canvas512'), 512);

  previewSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

  lucide.createIcons()
}

function drawFavicon(canvas, size) {
  const ctx = canvas.getContext('2d');
  const img = new Image();
  const blob = new Blob([currentSVG], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);

  img.onload = function () {
    ctx.clearRect(0, 0, size, size);
    ctx.drawImage(img, 0, 0, size, size);
    URL.revokeObjectURL(url);
  };

  img.onerror = function () {
    showError('Error rendering SVG. Please check your SVG code is valid.');
    URL.revokeObjectURL(url);
  };

  img.src = url;
}

function generatePNGBlob(size) {
  return new Promise((resolve, reject) => {
    if (!currentSVG) {
      reject('No SVG to generate');
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    const img = new Image();
    const blob = new Blob([currentSVG], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);

    img.onload = function () {
      ctx.clearRect(0, 0, size, size);
      ctx.drawImage(img, 0, 0, size, size);

      canvas.toBlob((pngBlob) => {
        resolve(pngBlob);
        URL.revokeObjectURL(url);
      });
    };

    img.onerror = function () {
      reject('Failed to render SVG for size ' + size);
      URL.revokeObjectURL(url);
    };

    img.src = url;
  });
}

async function downloadPNG(size) {
  try {
    const blob = await generatePNGBlob(size);
    let filename;

    if (size === 16) filename = 'favicon-16x16.png';
    else if (size === 32) filename = 'favicon-32x32.png';
    else if (size === 180) filename = 'apple-touch-icon.png';
    else if (size === 192) filename = 'android-chrome-192x192.png';
    else if (size === 512) filename = 'android-chrome-512x512.png';

    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);

  } catch (err) {
    console.error(err);
    showError('Error generating PNG for size ' + size);
  }
}


async function downloadAll() {
  if (!currentSVG) {
    showError('Please generate favicons first');
    return;
  }

  const sizes = [16, 32, 180, 192, 512];
  const zip = new JSZip();
  const folder = zip.folder('favicon');

  for (const size of sizes) {
    let filename;
    if (size === 16) filename = 'favicon-16x16.png';
    else if (size === 32) filename = 'favicon-32x32.png';
    else if (size === 180) filename = 'apple-touch-icon.png';
    else if (size === 192) filename = 'android-chrome-192x192.png';
    else if (size === 512) filename = 'android-chrome-512x512.png';

    try {
      const blob = await generatePNGBlob(size);
      folder.file(filename, blob);
    } catch (err) {
      console.error(err);
      showError('Error generating ' + filename);
    }
  }

  zip.generateAsync({ type: 'blob' }).then(function (content) {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(content);
    link.download = 'favicons.zip';
    link.click();
    URL.revokeObjectURL(link.href);
  });
}


function copyToClipboard() {
  const codeText = `<link rel="icon" type="image/png" sizes="16x16" href="/favicon/favicon-16x16.png">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon/favicon-32x32.png">
<link rel="apple-touch-icon" sizes="180x180" href="/favicon/apple-touch-icon.png">
<link rel="icon" type="image/png" sizes="192x192" href="/favicon/android-chrome-192x192.png">
<link rel="icon" type="image/png" sizes="512x512" href="/favicon/android-chrome-512x512.png">`;

  navigator.clipboard.writeText(codeText).then(() => {
    const copyButton = document.querySelector('.copy-button');
    const originalText = copyButton.textContent;

    copyButton.textContent = 'Copied!';
    copyButton.classList.add('copied');

    setTimeout(() => {
      copyButton.textContent = originalText;
      copyButton.classList.remove('copied');
    }, 2000);
  }).catch(err => {
    console.error('Failed to copy:', err);
    alert('Failed to copy to clipboard');
  });
}