import { useState, useRef } from 'react';
import styles from './AiExtractor.module.css';

const EXTRACTION_PROMPT = `Eres un asistente que extrae información de documentos de propuesta de compra inmobiliaria.
Analiza el documento y extrae ÚNICAMENTE estos datos en formato JSON puro (sin markdown, sin texto extra):
{"compradorNombre":"nombre completo del comprador","compradorNif":"NIF o DNI","compradorTel":"teléfono si aparece","viviendaDir":"dirección completa del inmueble","viviendaRef":"referencia comercial","precioOferta":"precio en números sin símbolo euro ni puntos de miles"}
Si algún dato no aparece devuelve null para ese campo. No inventes datos.`;

function getFileIcon(name) {
  const ext = (name || '').split('.').pop().toLowerCase();
  if (['jpg','jpeg','png','heic','webp'].includes(ext)) return '🖼️';
  if (ext === 'pdf') return '📑';
  if (['doc','docx'].includes(ext)) return '📝';
  return '📄';
}

function getMediaType(file) {
  const ext = file.name.split('.').pop().toLowerCase();
  const map = {
    jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
    webp: 'image/webp', gif: 'image/gif', heic: 'image/jpeg',
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
    const apiKey = localStorage.getItem('rk_anthropic_key') || '';
    if (!apiKey) {
      alert('⚠️ Introduce la API Key de Anthropic en Ajustes (⚙️).');
      return;
    }
    setStatus('loading');
    setStatusMsg('Analizando documento con IA…');

    try {
      const b64 = await fileToB64(file);
      const mt = getMediaType(file);
      const isImage = mt.startsWith('image/');

      const content = [
        {
          type: isImage ? 'image' : 'document',
          source: { type: 'base64', media_type: mt, data: b64 },
        },
        { type: 'text', text: EXTRACTION_PROMPT },
      ];

      const resp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 1024,
          messages: [{ role: 'user', content }],
        }),
      });

      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error?.message || 'Error API');

      const text = data.content?.find(b => b.type === 'text')?.text || '';
      const parsed = JSON.parse(text.replace(/```json|```/g, '').trim());

      onExtracted(parsed);
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
