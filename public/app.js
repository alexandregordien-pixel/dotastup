const { PDFDocument, StandardFonts, rgb } = window.PDFLib;

const state = {
  serviceId: 'neurochir',
  requestedByProductId: {},
  selectedByProductId: {},
  isGenerating: false,
  generatedDocs: [],
  previewDocIndex: null,
  errorMessage: '',
};

const formFieldMap = {
  renewalCheckboxIndex: 0,
  serviceFieldIndex: 3,
  line1FieldIndices: [5, 8, 10],
  line2FieldIndices: [6, 7, 9],
  noteFieldIndices: [11, 12, 13],
  totalQuantityFieldIndices: [14, 15, 16],
  requestDateFieldIndex: 17,
};

const elements = {
  app: document.querySelector('#app'),
};

function getServices() {
  return window.DOTASTUP_DATA.services;
}

function getCurrentService() {
  return getServices().find((service) => service.id === state.serviceId);
}

function formatDate(date) {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function getProductState(product) {
  const requestedRaw = state.requestedByProductId[product.id] ?? '';
  const requested = requestedRaw === '' ? null : Number(requestedRaw);
  const selected = Boolean(state.selectedByProductId[product.id]);

  return {
    requestedRaw,
    requested,
    selected,
  };
}

function getSelectedProducts() {
  return getCurrentService().products
    .map((product) => ({ product, state: getProductState(product) }))
    .filter(({ state }) => state.selected);
}

function chunk(items, size) {
  const output = [];
  for (let index = 0; index < items.length; index += size) {
    output.push(items.slice(index, index + size));
  }
  return output;
}

function numberToFrench(value) {
  const units = [
    'zero',
    'un',
    'deux',
    'trois',
    'quatre',
    'cinq',
    'six',
    'sept',
    'huit',
    'neuf',
    'dix',
    'onze',
    'douze',
    'treize',
    'quatorze',
    'quinze',
    'seize',
  ];
  const tens = {
    20: 'vingt',
    30: 'trente',
    40: 'quarante',
    50: 'cinquante',
    60: 'soixante',
  };

  if (value < 17) return units[value];
  if (value < 20) return `dix-${units[value - 10]}`;
  if (value < 70) {
    const ten = Math.floor(value / 10) * 10;
    const unit = value % 10;
    if (unit === 0) return tens[ten];
    if (unit === 1) return `${tens[ten]} et un`;
    return `${tens[ten]}-${units[unit]}`;
  }
  if (value < 80) {
    if (value === 71) return 'soixante et onze';
    return `soixante-${numberToFrench(value - 60)}`;
  }
  if (value === 80) return 'quatre-vingts';
  if (value < 100) return `quatre-vingt-${numberToFrench(value - 80)}`;
  return String(value);
}

function formatRequestedQuantity(value) {
  return `${numberToFrench(value).toUpperCase()} (${value})`;
}

function render() {
  const service = getCurrentService();
  const selectedProducts = getSelectedProducts();
  const requestPageCount = Math.max(1, Math.ceil(selectedProducts.length / 3));

  elements.app.innerHTML = `
    <section class="panel hero">
      <div>
        <p class="eyebrow">Demandes de renouvellement de medicaments stupefiants</p>
        <h1>DOTASTUP</h1>
        <p class="lead">ISG1G Alexandre GORDIEN - 9 avril 2026</p>
      </div>
      <div class="hero-card">
        <div class="hero-metric">
          <span>Produits coches</span>
          <strong>${selectedProducts.length}</strong>
        </div>
        <div class="hero-metric">
          <span>Formulaire(s)</span>
          <strong>${requestPageCount}</strong>
        </div>
      </div>
    </section>

    <section class="panel">
      <div class="section-head">
        <div>
          <p class="eyebrow">Service</p>
          <h2>Choix du coffre</h2>
        </div>
      </div>
      <div class="service-switch">
        ${getServices()
          .map(
            (item) => `
              <button
                type="button"
                class="service-chip ${item.id === state.serviceId ? 'is-active' : ''}"
                data-action="switch-service"
                data-service-id="${item.id}"
              >
                <span>${escapeHtml(item.label)}</span>
                <small>${escapeHtml(item.pdfServiceLabel)}</small>
              </button>
            `
          )
          .join('')}
      </div>
    </section>

    <section class="panel">
      <div class="section-head">
        <div>
          <p class="eyebrow">Produits</p>
          <h2>${escapeHtml(service.label)}</h2>
        </div>
        <div class="section-actions">
          <button type="button" class="ghost-button" data-action="reset-state">
            Reinitialiser la memoire
          </button>
          <button type="button" class="primary-button" data-action="generate-zip" ${
            selectedProducts.length === 0 || state.isGenerating ? 'disabled' : ''
          }>
            ${state.isGenerating ? 'Generation en cours...' : 'Generer les PDF'}
          </button>
        </div>
      </div>

      ${
        state.errorMessage
          ? `<div class="error-banner">${escapeHtml(state.errorMessage)}</div>`
          : ''
      }

      <div class="table-head">
        <span>Renouveler</span>
        <span>Medicament</span>
        <span>Dotation</span>
        <span>Commande</span>
        <span>Etat</span>
      </div>

      <div class="product-list">
        ${service.products
          .map((product) => {
            const productState = getProductState(product);
            const invalid =
              productState.requested !== null &&
              (Number.isNaN(productState.requested) ||
                productState.requested < 0 ||
                productState.requested > product.totalQuantity);

            return `
              <article class="product-row ${productState.selected ? 'is-selected' : ''}">
                <label class="checkbox-wrap">
                  <input
                    type="checkbox"
                    data-action="toggle-product"
                    data-product-id="${product.id}"
                    ${productState.selected ? 'checked' : ''}
                  />
                </label>
                <div class="product-main">
                  <strong>${escapeHtml(product.label)}</strong>
                  <small>${escapeHtml(product.requestLines.join(' | '))}</small>
                </div>
                <div class="pill">${product.totalQuantity} ${escapeHtml(product.unitLabel)}</div>
                <label class="remaining-input">
                  <input
                    type="number"
                    min="0"
                    max="${product.totalQuantity}"
                    step="1"
                    value="${escapeHtml(productState.requestedRaw)}"
                    data-action="update-requested"
                    data-product-id="${product.id}"
                    aria-label="Quantite commandee pour ${escapeHtml(product.label)}"
                  />
                  <span>${escapeHtml(product.unitLabel)}</span>
                </label>
                <div class="request-value ${invalid ? 'is-invalid' : ''}">
                  ${
                    invalid
                      ? `Verifier la saisie`
                      : productState.requested === null
                        ? `Saisir la commande`
                        : `${productState.requested} ${escapeHtml(product.unitLabel)}`
                  }
                </div>
              </article>
            `;
          })
          .join('')}
      </div>
    </section>

    <section class="panel summary">
      <div class="section-head">
        <div>
          <p class="eyebrow">Documents</p>
          <h2>Fichiers generes</h2>
        </div>
      </div>
      ${
        state.generatedDocs.length === 0
          ? `<p class="empty-state">Aucun document genere pour le moment.</p>`
          : `
            <div class="summary-grid with-preview">
              <div>
                <div class="bulk-actions-head">
                  <h3>Demandes et tracabilites</h3>
                  <div class="doc-actions">
                    <button type="button" class="ghost-button" data-action="download-all-docs">Tout telecharger</button>
                    <button type="button" class="ghost-button" data-action="print-all-docs">Tout imprimer</button>
                  </div>
                </div>
                <ul>
                  ${state.generatedDocs
                    .map(
                      (doc, index) => `
                        <li class="doc-item">
                          <div>
                            <strong>${escapeHtml(doc.name)}</strong>
                            <small>${escapeHtml(doc.kind)}</small>
                          </div>
                          <div class="doc-actions">
                            <button type="button" class="ghost-button" data-action="preview-doc" data-doc-index="${index}">Previsualiser</button>
                            <button type="button" class="ghost-button" data-action="download-doc" data-doc-index="${index}">Telecharger</button>
                          </div>
                        </li>
                      `
                    )
                    .join('')}
                </ul>
              </div>
              <div class="preview-panel">
                <div class="preview-head">
                  <div>
                    <h3>Apercu</h3>
                    <p class="preview-subtitle">
                      ${
                        state.previewDocIndex === null
                          ? 'Selectionne un document pour le visualiser ici.'
                          : escapeHtml(state.generatedDocs[state.previewDocIndex].name)
                      }
                    </p>
                  </div>
                  ${
                    state.previewDocIndex === null
                      ? ''
                      : `
                        <button
                          type="button"
                          class="ghost-button"
                          data-action="print-doc"
                          data-doc-index="${state.previewDocIndex}"
                        >
                          Imprimer
                        </button>
                      `
                  }
                </div>
                ${
                  state.previewDocIndex === null
                    ? `<div class="preview-empty">Le PDF apparaitra ici.</div>`
                    : `
                      <iframe
                        class="preview-frame"
                        src="${escapeHtml(state.generatedDocs[state.previewDocIndex].url)}#toolbar=1&navpanes=0"
                        title="Previsualisation PDF"
                      ></iframe>
                    `
                }
              </div>
            </div>
          `
      }
    </section>
  `;
}

function sanitizeEntry(product, productState) {
  if (productState.requested === null || Number.isNaN(productState.requested)) {
    throw new Error(`La quantite a commander est manquante pour ${product.label}.`);
  }

  if (productState.requested < 0 || productState.requested > product.totalQuantity) {
    throw new Error(`La quantite commandee pour ${product.label} doit etre comprise entre 0 et ${product.totalQuantity}.`);
  }

  if (productState.requested <= 0) {
    throw new Error(`La quantite commandee pour ${product.label} est nulle. Decoche ce produit ou ajuste la saisie.`);
  }
}

async function fetchArrayBuffer(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Impossible de charger ${url}`);
  }
  return response.arrayBuffer();
}

function clearForm(form, font) {
  form.getFields().forEach((field) => {
    const type = field.constructor.name;
    if (type === 'PDFTextField') {
      field.setText('');
    }
    if (type === 'PDFCheckBox') {
      field.uncheck();
    }
  });
  form.updateFieldAppearances(font);
}

function getFieldRect(field) {
  const widget = field.acroField.getWidgets()[0];
  return widget.getRectangle();
}

function drawFieldBackground(page, rect, options = {}) {
  const {
    fill = rgb(0.82, 0.97, 0.98),
    border = rgb(0.7, 0.83, 0.84),
    borderWidth = 0.6,
  } = options;

  page.drawRectangle({
    x: rect.x,
    y: rect.y,
    width: rect.width,
    height: rect.height,
    color: fill,
    borderColor: border,
    borderWidth,
  });
}

function drawFieldText(page, font, rect, text, options = {}) {
  const {
    size = 11,
    paddingX = 3,
    paddingY = 4,
    color = rgb(0.12, 0.2, 0.17),
  } = options;

  page.drawText(String(text), {
    x: rect.x + paddingX,
    y: rect.y + rect.height - size - paddingY,
    size,
    font,
    color,
    maxWidth: Math.max(rect.width - paddingX * 2, 0),
  });
}

function drawCheckMark(page, rect, font) {
  page.drawRectangle({
    x: rect.x,
    y: rect.y,
    width: rect.width,
    height: rect.height,
    color: rgb(0.82, 0.97, 0.98),
    borderColor: rgb(0.7, 0.83, 0.84),
    borderWidth: 0.6,
  });

  page.drawText('X', {
    x: rect.x + 1.2,
    y: rect.y + 0.4,
    size: 10,
    font,
    color: rgb(0.12, 0.2, 0.17),
  });
}

async function buildRequestPdf(templateBytes, service, entries, dateText) {
  const templatePdf = await PDFDocument.load(templateBytes, { ignoreEncryption: true });
  const form = templatePdf.getForm();
  const fields = form.getFields();

  const renewalRect = getFieldRect(fields[formFieldMap.renewalCheckboxIndex]);
  const setupRect = getFieldRect(fields[1]);
  const nominativeRect = getFieldRect(fields[2]);
  const serviceRect = getFieldRect(fields[formFieldMap.serviceFieldIndex]);
  const patientRect = getFieldRect(fields[4]);
  const requestDateRect = getFieldRect(fields[formFieldMap.requestDateFieldIndex]);
  const line1Rects = formFieldMap.line1FieldIndices.map((index) => getFieldRect(fields[index]));
  const line2Rects = formFieldMap.line2FieldIndices.map((index) => getFieldRect(fields[index]));
  const noteRects = formFieldMap.noteFieldIndices.map((index) => getFieldRect(fields[index]));
  const totalQuantityRects = formFieldMap.totalQuantityFieldIndices.map((index) => getFieldRect(fields[index]));
  const templatePage = templatePdf.getPages()[0];
  const pageSize = templatePage.getSize();

  const pdfjsLib = await import('/node_modules/pdfjs-dist/legacy/build/pdf.mjs');
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs';
  const loadingTask = pdfjsLib.getDocument({
    data: templateBytes,
    password: '',
    disableWorker: true,
  });
  const sourcePdf = await loadingTask.promise;
  const sourcePage = await sourcePdf.getPage(1);
  const viewport = sourcePage.getViewport({ scale: 2 });
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error("Impossible de preparer l'image du formulaire de demande.");
  }
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  await sourcePage.render({ canvasContext: context, viewport }).promise;
  const backgroundBytes = await new Promise((resolve, reject) => {
    canvas.toBlob(async (blob) => {
      if (!blob) {
        reject(new Error("Impossible de convertir le formulaire de demande en image."));
        return;
      }
      resolve(await blob.arrayBuffer());
    }, 'image/png');
  });

  const pdf = await PDFDocument.create();
  const page = pdf.addPage([pageSize.width, pageSize.height]);
  const backgroundImage = await pdf.embedPng(backgroundBytes);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdf.embedFont(StandardFonts.HelveticaBold);

  page.drawImage(backgroundImage, {
    x: 0,
    y: 0,
    width: pageSize.width,
    height: pageSize.height,
  });

  drawFieldBackground(page, serviceRect);
  drawFieldBackground(page, patientRect);
  drawFieldBackground(page, requestDateRect);

  [renewalRect, setupRect, nominativeRect].forEach((rect) => {
    page.drawRectangle({
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      color: rgb(0.82, 0.97, 0.98),
      borderColor: rgb(0.7, 0.83, 0.84),
      borderWidth: 0.6,
    });
  });

  line1Rects.forEach((rect) => drawFieldBackground(page, rect));
  line2Rects.forEach((rect) => drawFieldBackground(page, rect));
  noteRects.forEach((rect) => drawFieldBackground(page, rect));
  totalQuantityRects.forEach((rect) => drawFieldBackground(page, rect));

  entries.forEach(({ product, state: productState }, blockIndex) => {
    drawFieldText(page, font, line1Rects[blockIndex], product.requestLines[0]);
    drawFieldText(page, font, line2Rects[blockIndex], product.requestLines[1]);
    drawFieldText(
      page,
      boldFont,
      noteRects[blockIndex],
      formatRequestedQuantity(productState.requested)
    );
    drawFieldText(page, font, totalQuantityRects[blockIndex], String(product.totalQuantity), {
      size: 10,
      paddingX: 2,
      paddingY: 2,
    });
  });

  drawCheckMark(page, renewalRect, font);
  drawFieldText(page, font, serviceRect, service.pdfServiceLabel);
  drawFieldText(page, font, requestDateRect, dateText);

  return pdf.save({ useObjectStreams: false });
}

function revokeGeneratedDocs() {
  state.generatedDocs.forEach((doc) => URL.revokeObjectURL(doc.url));
  state.generatedDocs = [];
  state.previewDocIndex = null;
}

function resetState() {
  revokeGeneratedDocs();
  state.requestedByProductId = {};
  state.selectedByProductId = {};
  state.isGenerating = false;
  state.errorMessage = '';
}

function resetGeneratedOutput() {
  revokeGeneratedDocs();
  state.errorMessage = '';
}

async function generateDocuments() {
  const selectedProducts = getSelectedProducts();
  const service = getCurrentService();
  const dateText = formatDate(new Date());
  state.errorMessage = '';

  if (selectedProducts.length === 0) {
    return;
  }

  selectedProducts.forEach(({ product, state: productState }) => sanitizeEntry(product, productState));

  state.isGenerating = true;
  render();

  try {
    revokeGeneratedDocs();
    const [templateBytes, ...traceabilityBytes] = await Promise.all([
      fetchArrayBuffer(window.DOTASTUP_DATA.requestTemplate),
      ...selectedProducts.map(({ product }) => fetchArrayBuffer(product.traceabilityPdf)),
    ]);

    const generatedDocs = [];
    const requestChunks = chunk(selectedProducts, 3);
    for (let index = 0; index < requestChunks.length; index += 1) {
      const pdfBytes = await buildRequestPdf(templateBytes, service, requestChunks[index], dateText);
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      generatedDocs.push({
        kind: 'Formulaire de demande',
        name: `${service.id}-formulaire-demande-${String(index + 1).padStart(2, '0')}.pdf`,
        url: URL.createObjectURL(blob),
      });
    }

    traceabilityBytes.forEach((pdfBytes, index) => {
      const { product } = selectedProducts[index];
      generatedDocs.push({
        kind: 'Feuille de tracabilite vierge',
        name: product.traceabilityPdf.split('/').pop(),
        url: URL.createObjectURL(new Blob([pdfBytes], { type: 'application/pdf' })),
      });
    });

    state.generatedDocs = generatedDocs;
    state.previewDocIndex = generatedDocs.length > 0 ? 0 : null;
  } finally {
    state.isGenerating = false;
    render();
  }
}

function triggerDownload(doc) {
  const link = document.createElement('a');
  link.href = doc.url;
  link.download = doc.name;
  link.click();
}

function printDoc(doc) {
  const printWindow = window.open(doc.url, '_blank', 'noopener,noreferrer');
  if (printWindow) {
    printWindow.addEventListener('load', () => {
      printWindow.print();
    });
  }
}

document.addEventListener('click', (event) => {
  const target = event.target.closest('[data-action]');
  if (!target) return;

  const { action } = target.dataset;
  if (action === 'switch-service') {
    state.serviceId = target.dataset.serviceId;
    resetGeneratedOutput();
    render();
    return;
  }

  if (action === 'generate-zip') {
    generateDocuments().catch((error) => {
      state.isGenerating = false;
      state.errorMessage = error.message;
      render();
    });
    return;
  }

  if (action === 'preview-doc') {
    state.previewDocIndex = Number(target.dataset.docIndex);
    render();
    return;
  }

  if (action === 'print-doc') {
    const doc = state.generatedDocs[Number(target.dataset.docIndex)];
    if (doc) {
      printDoc(doc);
    }
    return;
  }

  if (action === 'download-doc') {
    const doc = state.generatedDocs[Number(target.dataset.docIndex)];
    if (doc) {
      triggerDownload(doc);
    }
    return;
  }

  if (action === 'download-all-docs') {
    state.generatedDocs.forEach((doc, index) => {
      window.setTimeout(() => triggerDownload(doc), index * 180);
    });
    return;
  }

  if (action === 'print-all-docs') {
    state.generatedDocs.forEach((doc, index) => {
      window.setTimeout(() => printDoc(doc), index * 300);
    });
    return;
  }

  if (action === 'reset-state') {
    resetState();
    render();
  }
});

function handleInputStateChange(event) {
  const target = event.target;
  if (!(target instanceof HTMLInputElement)) return;

  if (target.dataset.action === 'toggle-product') {
    state.selectedByProductId[target.dataset.productId] = target.checked;
    render();
    return;
  }

  if (target.dataset.action === 'update-requested') {
    state.requestedByProductId[target.dataset.productId] = target.value;
    render();
  }
}

document.addEventListener('change', handleInputStateChange);
document.addEventListener('input', handleInputStateChange);

render();
