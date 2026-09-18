import { useState, useRef } from 'react';
import styles from './AiExtractor.module.css';
import { BACKEND_URL, BACKEND_API_KEY } from '../config';

function getFileIcon(name) {
  const ext = (name || '').split('.').pop().toLowerCase();
  if (['jpg','jpeg','png','heic','webp'].includes(ext)) return '🖼️';
  if (ext === 'pdf') return '📑';
  if (['doc','docx'].includes(ext)) return '📝';
  return '📄';
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
      const formData = new FormData();
      formData.append('file', file);

      const resp = await fetch(`${BACKEND_URL}/extraer`, {
        method: 'POST',
        headers: { 'X-Perfil-Key': BACKEND_API_KEY },
        body: formData,
      });

      const data = await resp.json();
      if (!resp.ok || !data.ok) throw new Error(data.error || 'Error API');

      onExtracted(data.datos);
      setStatus('success');
      setStatusMsg('✅ Datos extraídos — revisa y corrige si es necesario');
    } catch (err) {
      console.error(err);
      setStatus('error');
      setStatusMsg('⚠️ No se pudo extraer la información. Rellena los datos manualmente.');
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
