// Constants
const MAX_GRID_SIZE = 20;

// DOM Elements
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const previewImg = document.getElementById('preview');
const colsInput = document.getElementById('colsInput');
const rowsInput = document.getElementById('rowsInput');
const splitBtn = document.getElementById('splitBtn');
const piecesGrid = document.getElementById('piecesGrid');
const emptyState = document.getElementById('emptyState');
const resultsHeader = document.getElementById('resultsHeader');
const resultsCount = document.getElementById('resultsCount');
const statKb = document.getElementById('fileSizeStat');
const dlAllBtn = document.getElementById('dlAllBtn');

// State
let currentImage = null;
let allPieceUrls = [];
let currentFileName = '';

// Helper Functions
function showToast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(window.toastTimer);
    window.toastTimer = setTimeout(() => t.classList.remove('show'), 2400);
}

function downloadFile(url, name) {
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

function cleanupUrls() {
    allPieceUrls.forEach(item => {
        if (item.url && item.url.startsWith('blob:')) {
            URL.revokeObjectURL(item.url);
        }
    });
}

function resetResults() {
    piecesGrid.innerHTML = '';
    cleanupUrls();
    allPieceUrls = [];
    resultsHeader.style.display = 'none';
    emptyState.style.display = 'block';
}

function renderGridPreview() {
    const c = Math.max(1, Math.min(MAX_GRID_SIZE, parseInt(colsInput.value) || 1));
    const r = Math.max(1, Math.min(MAX_GRID_SIZE, parseInt(rowsInput.value) || 1));
    const gp = document.getElementById('gridPreview');
    gp.style.gridTemplateColumns = `repeat(${c}, 1fr)`;
    gp.innerHTML = '';
    for (let i = 0; i < c * r; i++) {
        const cell = document.createElement('div');
        cell.className = 'grid-cell';
        cell.style.animationDelay = Math.min((i * 0.02), 0.5) + 's';
        gp.appendChild(cell);
    }
}

function sync(which) {
    let val;
    if (which === 'cols') {
        val = Math.max(1, Math.min(MAX_GRID_SIZE, parseInt(colsInput.value) || 1));
        colsInput.value = val;
        document.getElementById('colsDisplay').textContent = val;
    } else {
        val = Math.max(1, Math.min(MAX_GRID_SIZE, parseInt(rowsInput.value) || 1));
        rowsInput.value = val;
        document.getElementById('rowsDisplay').textContent = val;
    }
    renderGridPreview();
}

function adjust(which, delta) {
    const input = which === 'cols' ? colsInput : rowsInput;
    let v = (parseInt(input.value) || 1) + delta;
    v = Math.max(1, Math.min(MAX_GRID_SIZE, v));
    input.value = v;
    sync(which);
}

function loadImage(file) {
    if (!file || !file.type.startsWith('image/')) {
        showToast('Please select a valid image file');
        return;
    }

    if (file.size > 50 * 1024 * 1024) {
        showToast('Image too large! Maximum size is 50MB');
        return;
    }

    currentFileName = file.name.replace(/\.[^/.]+$/, '');
    
    const reader = new FileReader();
    reader.onload = ev => {
        const img = new Image();
        img.onload = () => {
            if (img.width > 8000 || img.height > 8000) {
                showToast('Image dimensions too large! Maximum 8000x8000 pixels');
                return;
            }
            
            currentImage = img;
            previewImg.src = ev.target.result;
            previewImg.style.display = 'block';
            uploadArea.classList.add('has-image');
            
            const kb = Math.round(file.size / 1024);
            statKb.textContent = kb >= 1024 ? (kb/1024).toFixed(1) + 'mb' : kb + 'kb';
            
            resetResults();
            showToast(`Loaded: ${file.name}`);
        };
        img.onerror = () => {
            showToast('Failed to load image. Please try another file.');
        };
        img.src = ev.target.result;
    };
    reader.onerror = () => {
        showToast('Failed to read file');
    };
    reader.readAsDataURL(file);
}

function splitImage() {
    if (!currentImage) {
        showToast('Upload an image first');
        return;
    }

    const cols = Math.max(1, Math.min(MAX_GRID_SIZE, parseInt(colsInput.value) || 1));
    const rows = Math.max(1, Math.min(MAX_GRID_SIZE, parseInt(rowsInput.value) || 1));
    
    splitBtn.disabled = true;
    splitBtn.style.opacity = '0.6';
    
    setTimeout(() => {
        try {
            const img = currentImage;
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            const pieceWidth = Math.floor(img.width / cols);
            const pieceHeight = Math.floor(img.height / rows);
            
            resetResults();
            
            piecesGrid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
            
            const total = cols * rows;
            
            for (let row = 0; row < rows; row++) {
                for (let col = 0; col < cols; col++) {
                    const sourceX = col * pieceWidth;
                    const sourceY = row * pieceHeight;
                    let width = pieceWidth;
                    let height = pieceHeight;
                    
                    if (col === cols - 1) {
                        width = img.width - sourceX;
                    }
                    if (row === rows - 1) {
                        height = img.height - sourceY;
                    }
                    
                    canvas.width = width;
                    canvas.height = height;
                    
                    ctx.drawImage(img, sourceX, sourceY, width, height, 0, 0, width, height);
                    
                    const url = canvas.toDataURL('image/png');
                    const pieceName = `${currentFileName || 'gridsz'}_${row+1}_${col+1}.png`;
                    allPieceUrls.push({ url, name: pieceName });
                    
                    const item = document.createElement('div');
                    item.className = 'piece-item';
                    item.style.animationDelay = Math.min(((row * cols + col) * 0.03), 0.5) + 's';
                    
                    const pieceImg = document.createElement('img');
                    pieceImg.src = url;
                    pieceImg.alt = `Piece ${row+1},${col+1}`;
                    pieceImg.loading = 'lazy';
                    
                    const overlay = document.createElement('div');
                    overlay.className = 'piece-overlay';
                    overlay.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg><span>${row+1},${col+1}</span>`;
                    
                    const badge = document.createElement('div');
                    badge.className = 'piece-badge';
                    badge.textContent = `${row+1}·${col+1}`;
                    
                    const currentRow = row + 1;
                    const currentCol = col + 1;
                    const pieceUrl = url;
                    const pieceDisplayName = pieceName;
                    
                    item.addEventListener('click', (function(u, n, r, c) {
                        return function() { 
                            downloadFile(u, n); 
                            showToast(`Downloaded piece ${r},${c}`);
                        };
                    })(pieceUrl, pieceDisplayName, currentRow, currentCol));
                    
                    item.appendChild(pieceImg);
                    item.appendChild(overlay);
                    item.appendChild(badge);
                    piecesGrid.appendChild(item);
                }
            }
            
            resultsHeader.style.display = 'flex';
            resultsCount.textContent = `${total} ${total === 1 ? 'piece' : 'pieces'}`;
            emptyState.style.display = 'none';
            showToast(`Split into ${total} pieces ✓`);
            
        } catch (error) {
            console.error('Split error:', error);
            showToast('Error splitting image. Please try again.');
        } finally {
            splitBtn.disabled = false;
            splitBtn.style.opacity = '1';
        }
    }, 10);
}

function downloadAll() {
    if (!allPieceUrls.length) {
        showToast('No pieces to download');
        return;
    }
    
    showToast(`Downloading ${allPieceUrls.length} pieces...`);
    
    allPieceUrls.forEach((p, i) => {
        setTimeout(() => downloadFile(p.url, p.name), i * 150);
    });
}

// Event Listeners
uploadArea.addEventListener('click', () => fileInput.click());

uploadArea.addEventListener('dragover', e => {
    e.preventDefault();
    uploadArea.classList.add('drag-over');
});

uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('drag-over'));

uploadArea.addEventListener('drop', e => {
    e.preventDefault();
    uploadArea.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
        loadImage(file);
    } else {
        showToast('Please drop an image file');
    }
});

fileInput.addEventListener('change', () => {
    if (fileInput.files.length) {
        loadImage(fileInput.files[0]);
        fileInput.value = '';
    }
});

document.getElementById('decreaseCols').addEventListener('click', () => adjust('cols', -1));
document.getElementById('increaseCols').addEventListener('click', () => adjust('cols', 1));
document.getElementById('decreaseRows').addEventListener('click', () => adjust('rows', -1));
document.getElementById('increaseRows').addEventListener('click', () => adjust('rows', 1));

colsInput.addEventListener('input', () => sync('cols'));
rowsInput.addEventListener('input', () => sync('rows'));
splitBtn.addEventListener('click', splitImage);
dlAllBtn.addEventListener('click', downloadAll);

// Initialize
renderGridPreview();

// Keyboard shortcut
document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (currentImage) splitImage();
    }
});
