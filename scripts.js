// script.js

function waitForImageLoad(img) {
    return new Promise((resolve) => {
      if (img.complete && img.naturalHeight !== 0) {
        resolve();
      } else {
        img.onload = () => resolve();
        img.onerror = () => resolve(); // fail-safe
      }
    });
  }
  
  document.getElementById("name").addEventListener("input", e => {
    document.getElementById("preview-name").textContent = e.target.value;
  });
  document.getElementById("grade").addEventListener("input", e => {
    document.getElementById("preview-grade").textContent = e.target.value;
  });
  document.getElementById("studentNo").addEventListener("input", e => {
    document.getElementById("preview-studentNo").textContent = e.target.value;
  });
  document.getElementById("photo").addEventListener("change", e => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = function(event) {
        document.getElementById("preview-photo").src = event.target.result;
      };
      reader.readAsDataURL(file);
    } else {
      document.getElementById("preview-photo").src = "";
    }
  });
  
  async function generatePDF() {
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ unit: 'pt', format: [153, 243] });
    const frontOrig = document.getElementById("id-front");
    const backOrig = document.getElementById("id-back");
  
    const front = frontOrig.cloneNode(true);
    const back = backOrig.cloneNode(true);
  
    [front, back].forEach(el => {
      el.style.position = "fixed";
      el.style.top = "-9999px";
      el.style.left = "-9999px";
      document.body.appendChild(el);
    });
  
    await waitForImageLoad(front.querySelector("#preview-photo"));
  
    const frontCanvas = await html2canvas(front, { useCORS: true });
    const backCanvas = await html2canvas(back, { useCORS: true });
  
    front.remove();
    back.remove();
  
    pdf.addImage(frontCanvas.toDataURL("image/png"), "PNG", 0, 0, 153, 243);
    pdf.addPage();
    pdf.addImage(backCanvas.toDataURL("image/png"), "PNG", 0, 0, 153, 243);
  
    pdf.save("student-id.pdf");
  }
  
  const PAGE_WIDTH = 1008, PAGE_HEIGHT = 612, ID_WIDTH = 153, ID_HEIGHT = 243, GAP = 20;
  
  async function generateBatchPDFfromZip() {
    const zipInput = document.getElementById("zipUpload");
    if (!zipInput.files[0]) return alert("Please upload a ZIP file");
  
    const zip = await JSZip.loadAsync(zipInput.files[0]);
    const csvFile = Object.values(zip.files).find(f => f.name.endsWith(".csv"));
    if (!csvFile) return alert("CSV file not found in ZIP");
  
    const csvContent = await csvFile.async("string");
    Papa.parse(csvContent, {
      header: true,
      complete: async function(results) {
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({ unit: 'pt', format: [PAGE_WIDTH, PAGE_HEIGHT], orientation: 'landscape' });
        const fronts = [], backs = [];
  
        for (let row of results.data) {
          const front = document.getElementById("id-front").cloneNode(true);
          const back = document.getElementById("id-back").cloneNode(true);
  
          [front, back].forEach(el => {
            el.style.position = "fixed";
            el.style.top = "-9999px";
            el.style.left = "-9999px";
            document.body.appendChild(el);
          });
  
          front.querySelector("#preview-name").textContent = row.name || "";
          front.querySelector("#preview-grade").textContent = row.grade || "";
          front.querySelector("#preview-studentNo").textContent = row.studentNo || "";
  
          if (row.photo && zip.file(row.photo)) {
            const blob = await zip.file(row.photo).async("blob");
            const reader = new FileReader();
            const dataUrl = await new Promise(res => {
              reader.onload = () => res(reader.result);
              reader.readAsDataURL(blob);
            });
            front.querySelector("#preview-photo").src = dataUrl;
          } else {
            front.querySelector("#preview-photo").src = "";
          }
  
          await waitForImageLoad(front.querySelector("#preview-photo"));
  
          const frontCanvas = await html2canvas(front, { useCORS: true });
          const backCanvas = await html2canvas(back, { useCORS: true });
  
          fronts.push(frontCanvas.toDataURL("image/png"));
          backs.push(backCanvas.toDataURL("image/png"));
  
          front.remove();
          back.remove();
        }
  
        for (let i = 0; i < fronts.length; i++) {
          const pos = i % 4;
          if (pos === 0 && i !== 0) pdf.addPage();
          const x = GAP + (pos % 2) * (ID_WIDTH + GAP);
          const y = GAP + Math.floor(pos / 2) * (ID_HEIGHT + GAP);
          pdf.addImage(fronts[i], "PNG", x, y, ID_WIDTH, ID_HEIGHT);
        }
  
        for (let i = 0; i < backs.length; i++) {
          const pos = i % 4;
          if (pos === 0) pdf.addPage();
          const x = GAP + (pos % 2) * (ID_WIDTH + GAP);
          const y = GAP + Math.floor(pos / 2) * (ID_HEIGHT + GAP);
          pdf.addImage(backs[i], "PNG", x, y, ID_WIDTH, ID_HEIGHT);
        }
  
        pdf.save("batch-ids-with-backs.pdf");
      }
    });
  }