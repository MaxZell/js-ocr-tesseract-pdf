var pdfDoc = null,
    pageNum = 1,
    pageRendering = false,
    pageNumPending = null;

var tesseractWorker = null;

async function showPDF(pdfData) {

  var { pdfjsLib } = globalThis;

  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.269/pdf.worker.min.mjs';

  var loadingTask = pdfjsLib.getDocument(pdfData);
  loadingTask.promise.then(function(pdf) {
    console.log('PDF loaded');
    pdfDoc = pdf;
    document.getElementById('page_count').textContent = pdfDoc.numPages;
    renderPage(pageNum);
    
  }, function (reason) {
    // PDF loading error
    console.error(reason);
  });
}

function renderPage(num) {
    pdfDoc.getPage(pageNum).then(function(page) {
  
        var scale = 1.5;
        var viewport = page.getViewport({scale: scale});

        var canvas = document.getElementById('canvas');
        var context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;
  
        var renderContext = {
          canvasContext: context,
          viewport: viewport
        };
        var renderTask = page.render(renderContext);
        renderTask.promise.then(function () {
          extractText();
          pageRendering = false;
          if (pageNumPending !== null) {
            renderPage(pageNumPending);
            pageNumPending = null;
          }
        });
      });
      document.getElementById('page_num').textContent = num;
}

function queueRenderPage(num) {
    if (pageRendering) {
        pageNumPending = num;
    } else {
        renderPage(num);
    }
}


function onPrevPage() {
    if (pageNum <= 1) {
        return;
    }
    pageNum--;
    queueRenderPage(pageNum);
}
document.getElementById('prev').addEventListener('click', onPrevPage);

function onNextPage() {
    if (pageNum >= pdfDoc.numPages) {
        return;
    }
    pageNum++;
    queueRenderPage(pageNum);
}
document.getElementById('next').addEventListener('click', onNextPage);

var uploadPDF = document.getElementById('uploadPDF');

uploadPDF.addEventListener('change', function(e) {
    let file = e.currentTarget.files[0];
    if (!file) return;
    readFileAsDataURL(file).then((b64str) => {
        pageNum = 1,
        pageRendering = false,
        pageNumPending = null;
        showPDF(b64str);
    }, false);
});

function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
        let fileReader = new FileReader();
        fileReader.onload = () => resolve(fileReader.result);
        fileReader.onerror = () => reject(fileReader);
        fileReader.readAsDataURL(file);
    });
}

async function initTesseract() {
    tesseractWorker = await Tesseract.createWorker('eng', 1, {workerPath: 'https://cdn.jsdelivr.net/npm/tesseract.js@v5.0.0/dist/worker.min.js'});
}

async function extractText() {
    await initTesseract();
    let imageString = document.getElementById('canvas').toDataURL();
    let image = await loadImage(imageString);
    const { data: { text } } = await tesseractWorker.recognize(image);
    document.getElementById('extracted-text').textContent = text;
    await tesseractWorker.terminate();
}

async function loadImage(url) {
    return new Promise((resolve, reject) => {
        const img = new Image();
            img.addEventListener('load', () => resolve(img));
            img.addEventListener('error', (err) => reject(err));
            img.src = url;
    });
}