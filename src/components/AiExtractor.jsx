import { useState, useRef } from 'react';
import styles from './AiExtractor.module.css';
function getFileIcon(name) {
  const ext = (name || '').split('.').pop().toLowerCase();
  if (['jpg','jpeg','png','heic','webp'].includes(ext)) return '🖼️';
  if (ext === 'pdf') return '📑';
  if (['doc','docx'].includes(ext)) return '📝';
  return '📄';
}

function isImage(file) {
  const ext = file.name.split('.').pop().toLowerCase();
  return file.type.startsWith('image/') || ['jpg','jpeg','png','heic','webp'].includes(ext);
}

function getMediaType(file) {
  const ext = file.name.split('.').pop().toLowerCase();
  const map = {
    pdf: 'application/pdf',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    doc: 'application/msword',
  };
  return map[ext] || file.type || 'application/octet-stream';
}

function fileToB64(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result.split(',')[1]);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

// Reduce las fotos a JPEG de máx. 2000px: Vercel limita la petición a 4,5 MB
// y así las fotos HEIC del iPhone llegan como JPEG, que la IA sí entiende.
function imageToJpegB64(file) {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, 2000 / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      res(canvas.toDataURL('image/jpeg', 0.85).split(',')[1]);
    };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('No se pudo leer la imagen')); };
    img.src = url;
  });
}

export default function AiExtractor({ onExtracted }) {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState(null); // null | 'loading' | 'success' | 'error'
  const [statusMsg, setStatusMsg] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef(null);

  function handleFile(f) {
    if (!f) return;
    setFile(f);
    setStatus(null);
  }

  function clearFile() {
    setFile(null);
    setStatus(null);
    if (inputRef.current) inputRef.current.value = '';
  }

  function handleDrop(e) {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  }

  async function extract() {
    setStatus('loading');
    setStatusMsg('Analizando documento con IA…');

    try {
      const image = isImage(file);
      const payload = {
        filename: file.name,
        mediaType: image ? 'image/jpeg' : getMediaType(file),
        data: image ? await imageToJpegB64(file) : await fileToB64(file),
      };

      const resp = await fetch('/api/extraer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await resp.json();
      if (!resp.ok || !data.ok) throw new Error(data.error || 'Error API');

      onExtracted(data.datos);
      setStatus('success');
      setStatusMsg('✅ Datos extraídos — revisa y corrige si es necesario');
    } catch (err) {
      console.error(err);
      setStatus('error');
      setStatusMsg(`⚠️ No se pudo extraer la información (${err.message}). Rellena los datos manualmente.`);
    }
  }

  return (
    <div className={styles.zone}>
      <div className={styles.zoneHeader}>
        <span className={styles.badge}>IA</span>
        <span className={styles.zoneTitle}>Extracción automática desde la propuesta firmada</span>
      </div>
      <div className={styles.zoneBody}>
        {!file ? (
          <div
            className={`${styles.dropArea} ${isDragging ? styles.dragging : ''}`}
            onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.docx,.doc,.jpg,.jpeg,.png,.heic,.webp"
              style={{ display: 'none' }}
              onChange={e => handleFile(e.target.files[0])}
            />
            <div className={styles.dropIcon}>📄</div>
            <div className={styles.dropText}>Sube la propuesta de precio</div>
            <div className={styles.dropSub}>PDF · Word · Foto · Escaneado — Arrastra o pulsa para seleccionar</div>
          </div>
        ) : (
          <div className={styles.fileSelected}>
            <span className={styles.fileIcon}>{getFileIcon(file.name)}</span>
            <div className={styles.fileInfo}>
              <div className={styles.fileName}>{file.name}</div>
              <div className={styles.fileSize}>{(file.size / 1024).toFixed(0)} KB</div>
            </div>
            <button type="button" className={styles.fileRemove} onClick={clearFile}>✕</button>
          </div>
        )}

        {status && (
          <div className={`${styles.status} ${styles[status]}`}>
            {status === 'loading' && <div className={styles.spinner} />}
            <span>{statusMsg}</span>
          </div>
        )}

        <button
          type="button"
          className={styles.btnExtract}
          onClick={extract}
          disabled={!file || status === 'loading'}
        >
          {status === 'loading' ? '⏳ Analizando…' : '✨ Extraer datos automáticamente'}
        </button>
      </div>
    </div>
  );
}
