import { useState, useRef } from 'react';
import AiExtractor from './AiExtractor';
import SectionCard from './SectionCard';
import Field from './Field';
import { CAPTADORES } from '../data';
import styles from './PerfilComprador.module.css';
import shared from './StepShared.module.css';

const INITIAL = {
  compradorNombre: '',
  compradorNif: '',
  compradorTel: '',
  compradorEmail: '',
  viviendaDir: '',
  viviendaRef: '',
  precioOferta: '',
  cuestionarioRelleno: null,
  honorariosTres: null,
  honorariosAutorizado: null,
  necesitaHipoteca: null,
  porcentajeHipoteca: '',
  bancoPrestamo: '',
  sujetaTaskacion: null,
  vendeParaComprar: null,
  vendeExplicacion: '',
  sabePierde1000: null,
  sabeArrasNoHipoteca: null,
};

function Toggle({ value, onChange, id }) {
  return (
    <div className={styles.toggleGroup}>
      <button type="button"
        className={`${styles.toggleBtn} ${value === 'SI' ? styles.activeSi : ''}`}
        onClick={() => onChange(id, value === 'SI' ? null : 'SI')}>SÍ</button>
      <button type="button"
        className={`${styles.toggleBtn} ${value === 'NO' ? styles.activeNo : ''}`}
        onClick={() => onChange(id, value === 'NO' ? null : 'NO')}>NO</button>
    </div>
  );
}

function QuestionRow({ label, fieldKey, form, onChange, hasError, children }) {
  return (
    <div className={styles.qRow}>
      <div className={styles.qMain}>
        <span className={`${styles.qLabel} ${hasError ? styles.qLabelError : ''}`}>{label}</span>
        <Toggle value={form[fieldKey]} onChange={onChange} id={fieldKey} />
      </div>
      {hasError && <p className={styles.fieldError}>Campo obligatorio</p>}
      {children}
    </div>
  );
}

function FileUploadSlot({ label, file, onFile, hasError, accept = '*/*' }) {
  const ref = useRef(null);
  return (
    <div
      className={`${styles.fileSlot} ${file ? styles.fileSlotDone : ''} ${hasError ? styles.fileSlotError : ''}`}
      onClick={() => ref.current?.click()}
    >
      <input ref={ref} type="file" accept={accept} style={{ display: 'none' }}
        onChange={e => onFile(e.target.files[0] || null)} />
      <span className={styles.fileIcon}>{file ? '✅' : '📎'}</span>
      <div className={styles.fileText}>
        <span className={styles.fileLabel}>{label} <span className={styles.fileReq}>*</span></span>
        <span className={styles.fileName}>{file ? file.name : 'Toca para adjuntar'}</span>
      </div>
      {file && (
        <button type="button" className={styles.fileRemove}
          onClick={e => { e.stopPropagation(); onFile(null); }}>✕</button>
      )}
    </div>
  );
}

// Badge "Extraído por IA"
function AiBadge({ show }) {
  if (!show) return null;
  return <span className={styles.aiBadge}>✓ Extraído por IA</span>;
}

export default function PerfilComprador({ slackToken, agenteRemitente, onSuccess }) {
  const [form, setForm] = useState(INITIAL);
  const [captador, setCaptador] = useState(null);
  const [errors, setErrors] = useState({});
  const [sending, setSending] = useState(false);
  const [fileOferta, setFileOferta] = useState(null);
  const [fileHonorarios, setFileHonorarios] = useState(null);
  const [fileJustificante, setFileJustificante] = useState(null);
  const [aiFilledComp, setAiFilledComp] = useState(false);
  const [aiFilledInm, setAiFilledInm] = useState(false);

  function handleChange(key, value) {
    setForm(prev => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: false }));
  }

  // Called when AI extracts data from document
  function handleExtracted(data) {
    const compKeys = ['compradorNombre', 'compradorNif', 'compradorTel'];
    const inmKeys  = ['viviendaDir', 'viviendaRef', 'precioOferta'];
    let fillComp = false, fillInm = false;

    const updates = {};
    Object.entries(data).forEach(([key, val]) => {
      if (val != null && val !== '') {
        updates[key] = String(val);
        if (compKeys.includes(key)) fillComp = true;
        if (inmKeys.includes(key))  fillInm  = true;
      }
    });

    setForm(prev => ({ ...prev, ...updates }));
    if (fillComp) setAiFilledComp(true);
    if (fillInm)  setAiFilledInm(true);
  }

  function validate() {
    const errs = {};
    if (!form.compradorNombre.trim()) errs.compradorNombre = true;
    if (!form.viviendaDir.trim())     errs.viviendaDir = true;
    if (!captador)                    errs.captador = true;
    if (!form.cuestionarioRelleno)    errs.cuestionarioRelleno = true;
    if (!form.honorariosTres)         errs.honorariosTres = true;
    if (form.honorariosTres === 'NO' && !form.honorariosAutorizado) errs.honorariosAutorizado = true;
    if (!form.necesitaHipoteca)       errs.necesitaHipoteca = true;
    if (!form.vendeParaComprar)       errs.vendeParaComprar = true;
    if (!form.sabePierde1000)         errs.sabePierde1000 = true;
    if (!form.sabeArrasNoHipoteca)    errs.sabeArrasNoHipoteca = true;
    if (!fileOferta)                  errs.fileOferta = true;
    if (!fileHonorarios)              errs.fileHonorarios = true;
    if (!fileJustificante)            errs.fileJustificante = true;
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function buildSlackMessage() {
    const honorariosLine = form.honorariosTres === 'NO'
      ? `NO _(autorización gerencia: ${form.honorariosAutorizado || '—'})_`
      : 'SÍ (3% + IVA)';

    let hipotecaLine = form.necesitaHipoteca === 'NO' ? 'NO' : 'SÍ';
    if (form.necesitaHipoteca === 'SI') {
      if (form.porcentajeHipoteca) hipotecaLine += ` — ${form.porcentajeHipoteca}%`;
      if (form.bancoPrestamo)      hipotecaLine += ` — ${form.bancoPrestamo}`;
      if (form.sujetaTaskacion === 'SI') hipotecaLine += ' — Sujeta a tasación';
      if (form.sujetaTaskacion === 'NO') hipotecaLine += ' — No sujeta a tasación';
    }

    const vendeLine = form.vendeParaComprar === 'NO' ? 'NO'
      : `SÍ${form.vendeExplicacion ? '\n   > ' + form.vendeExplicacion : ''}`;

    const today = new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });

    return [
      `👤 *Perfil del Comprador — ${form.compradorNombre}*`,
      ``,
      `🏠 *Inmueble:* ${form.viviendaDir}${form.viviendaRef ? ' (' + form.viviendaRef + ')' : ''}`,
      form.precioOferta ? `💶 *Precio oferta:* ${form.precioOferta} €` : null,
      form.compradorTel   ? `📞 *Teléfono:* ${form.compradorTel}`    : null,
      form.compradorEmail ? `📧 *Email:* ${form.compradorEmail}`      : null,
      form.compradorNif   ? `🪪 *NIF/DNI:* ${form.compradorNif}`     : null,
      ``,
      `*─── Checklist ───*`,
      ``,
      `📋 *Cuestionario rellenado con el cliente:* ${form.cuestionarioRelleno}`,
      `💶 *Honorarios 3%:* ${honorariosLine}`,
      `🏦 *Necesita hipoteca:* ${hipotecaLine}`,
      `🔄 *Vende para comprar:* ${vendeLine}`,
      `⚠️ *Sabe que puede perder los 1.000 € si el vendedor acepta y se echan atrás:* ${form.sabePierde1000}`,
      `📝 *Sabe que las arras no se condicionan a hipoteca:* ${form.sabeArrasNoHipoteca}`,
      ``,
      `📎 *Documentos adjuntos:* Oferta · Honorarios · Justificante`,
      ``,
      `_Enviado por ${agenteRemitente || 'agente'} · ${today}_`,
    ].filter(l => l !== null).join('\n');
  }

  async function uploadFile(token, channelId, file, title) {
    const fd = new FormData();
    fd.append('token', token);
    fd.append('channels', channelId);
    fd.append('file', file, file.name);
    fd.append('title', title);
    fd.append('filename', file.name);
    const res = await fetch('https://slack.com/api/files.upload', { method: 'POST', body: fd });
    const json = await res.json();
    if (!json.ok) throw new Error('files.upload (' + title + '): ' + json.error);
  }

  async function handleSend() {
    if (!validate()) { window.scrollTo(0, 0); return; }
    setSending(true);

    if (!slackToken) {
      alert('⚠️ Introduce el token Slack en Ajustes (⚙️).');
      setSending(false);
      return;
    }
    if (captador?.channel === 'PENDING') {
      alert('⚠️ El canal de ' + captador.name + ' está pendiente de confirmar.');
      setSending(false);
      return;
    }
    if (captador?.channel === 'DIRECT') {
      alert('ℹ️ Este agente no tiene canal asignado. Envía manualmente.');
      setSending(false);
      return;
    }

    try {
      const msgRes = await fetch('https://slack.com/api/chat.postMessage', {
        method: 'POST',
        headers: { Authorization: `Bearer ${slackToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel: captador.channel, text: buildSlackMessage() }),
      });
      const msgJson = await msgRes.json();
      if (!msgJson.ok) throw new Error('chat.postMessage: ' + msgJson.error);

      await Promise.all([
        uploadFile(slackToken, captador.channel, fileOferta,      '📄 Oferta'),
        uploadFile(slackToken, captador.channel, fileHonorarios,  '💶 Honorarios'),
        uploadFile(slackToken, captador.channel, fileJustificante,'🧾 Justificante'),
      ]);

      onSuccess(captador);
    } catch (err) {
      alert('⚠️ Error al enviar por Slack:\n' + err.message);
    }

    setSending(false);
  }

  const errCount = Object.keys(errors).length;

  return (
    <div>
      {/* ── AI EXTRACTION ── */}
      <AiExtractor onExtracted={handleExtracted} />

      {errCount > 0 && (
        <div className={styles.errorBanner}>
          ⚠️ Hay {errCount} campo{errCount > 1 ? 's' : ''} sin completar. Revisa los elementos marcados.
        </div>
      )}

      {/* ── COMPRADOR ── */}
      <SectionCard icon="👤" title="Datos del comprador" extra={<AiBadge show={aiFilledComp} />}>
        <div className={shared.grid}>
          <Field label="Nombre y apellidos" required>
            <input type="text" value={form.compradorNombre}
              onChange={e => handleChange('compradorNombre', e.target.value)}
              placeholder="Nombre completo del comprador"
              className={`${errors.compradorNombre ? shared.inputError : ''} ${aiFilledComp && form.compradorNombre ? styles.aiFilled : ''}`} />
          </Field>
          <div className={shared.grid2}>
            <Field label="NIF / DNI">
              <input type="text" value={form.compradorNif}
                onChange={e => handleChange('compradorNif', e.target.value)}
                placeholder="12345678A"
                className={form.compradorNif && aiFilledComp ? styles.aiFilled : ''} />
            </Field>
            <Field label="Teléfono">
              <input type="tel" value={form.compradorTel}
                onChange={e => handleChange('compradorTel', e.target.value)}
                placeholder="600 000 000"
                className={form.compradorTel && aiFilledComp ? styles.aiFilled : ''} />
            </Field>
          </div>
          <Field label="Email">
            <input type="email" value={form.compradorEmail}
              onChange={e => handleChange('compradorEmail', e.target.value)}
              placeholder="email@ejemplo.com" />
          </Field>
        </div>
      </SectionCard>

      {/* ── INMUEBLE ── */}
      <SectionCard icon="🏠" title="Inmueble de interés" extra={<AiBadge show={aiFilledInm} />}>
        <div className={shared.grid}>
          <Field label="Dirección" required>
            <input type="text" value={form.viviendaDir}
              onChange={e => handleChange('viviendaDir', e.target.value)}
              placeholder="C/ Mayor, 12, 3º B, Foios"
              className={`${errors.viviendaDir ? shared.inputError : ''} ${form.viviendaDir && aiFilledInm ? styles.aiFilled : ''}`} />
          </Field>
          <div className={shared.grid2}>
            <Field label="Ref. comercial">
              <input type="text" value={form.viviendaRef}
                onChange={e => handleChange('viviendaRef', e.target.value)}
                placeholder="FOI-1234"
                className={form.viviendaRef && aiFilledInm ? styles.aiFilled : ''} />
            </Field>
            <Field label="Precio de la oferta">
              <div className={shared.amountWrap}>
                <input type="text" value={form.precioOferta}
                  onChange={e => handleChange('precioOferta', e.target.value)}
                  placeholder="180.000"
                  className={form.precioOferta && aiFilledInm ? styles.aiFilled : ''} />
                <span className={shared.amountSuffix}>€</span>
              </div>
            </Field>
          </div>
        </div>
      </SectionCard>

      {/* ── CAPTADOR ── */}
      <SectionCard icon="🎯" title="Captador de la vivienda">
        <p style={{ fontSize: 12, color: 'var(--gray-600)', marginBottom: 14 }}>
          Selecciona el captador — recibirá el perfil y los documentos por Slack.
        </p>
        <div className={styles.captadorGrid}>
          {CAPTADORES.map((c, i) => (
            <button key={i} type="button"
              className={`${styles.captadorCard} ${captador?.channel === c.channel ? styles.selected : ''}`}
              onClick={() => { setCaptador(c); setErrors(p => ({ ...p, captador: false })); }}>
              <div className={styles.avatar}>{c.initials}</div>
              <span className={styles.captadorName}>{c.name}</span>
            </button>
          ))}
        </div>
        {errors.captador && <p className={styles.fieldError} style={{ marginTop: 10 }}>Selecciona un captador.</p>}
      </SectionCard>

      {/* ── CHECKLIST ── */}
      <SectionCard icon="📋" title="Checklist del comprador">
        <QuestionRow label="¿Se ha rellenado el cuestionario junto con el cliente?"
          fieldKey="cuestionarioRelleno" form={form} onChange={handleChange}
          hasError={!!errors.cuestionarioRelleno} />

        <QuestionRow label="¿Los honorarios son del 3%?"
          fieldKey="honorariosTres" form={form} onChange={handleChange}
          hasError={!!errors.honorariosTres}>
          {form.honorariosTres === 'NO' && (
            <div className={styles.subQuestion}>
              <div className={styles.subRow}>
                <span className={`${styles.subLabel} ${errors.honorariosAutorizado ? styles.qLabelError : ''}`}>
                  ⚠️ ¿Está autorizado por gerencia?
                </span>
                <Toggle value={form.honorariosAutorizado} onChange={handleChange} id="honorariosAutorizado" />
              </div>
              {errors.honorariosAutorizado && <p className={styles.fieldError}>Indica si hay autorización de gerencia</p>}
            </div>
          )}
        </QuestionRow>

        <QuestionRow label="¿Necesita hacer hipoteca?"
          fieldKey="necesitaHipoteca" form={form} onChange={handleChange}
          hasError={!!errors.necesitaHipoteca}>
          {form.necesitaHipoteca === 'SI' && (
            <div className={styles.subQuestion}>
              <div className={shared.grid3}>
                <Field label="Porcentaje">
                  <div className={shared.amountWrap}>
                    <input type="number" value={form.porcentajeHipoteca}
                      onChange={e => handleChange('porcentajeHipoteca', e.target.value)}
                      placeholder="80" min="0" max="100" />
                    <span className={shared.amountSuffix}>%</span>
                  </div>
                </Field>
                <Field label="Entidad bancaria">
                  <input type="text" value={form.bancoPrestamo}
                    onChange={e => handleChange('bancoPrestamo', e.target.value)}
                    placeholder="CaixaBank, BBVA..." />
                </Field>
                <div>
                  <div className={styles.subLabel} style={{ marginBottom: 8 }}>¿Sujeta a tasación?</div>
                  <Toggle value={form.sujetaTaskacion} onChange={handleChange} id="sujetaTaskacion" />
                </div>
              </div>
            </div>
          )}
        </QuestionRow>

        <QuestionRow label="¿Vende para comprar?"
          fieldKey="vendeParaComprar" form={form} onChange={handleChange}
          hasError={!!errors.vendeParaComprar}>
          {form.vendeParaComprar === 'SI' && (
            <div className={styles.subQuestion}>
              <Field label="Explica la operación">
                <textarea value={form.vendeExplicacion}
                  onChange={e => handleChange('vendeExplicacion', e.target.value)}
                  placeholder="Describe la situación: qué vende, estado de la venta, plazos estimados..."
                  style={{ minHeight: 72 }} />
              </Field>
            </div>
          )}
        </QuestionRow>

        <QuestionRow
          label="¿Sabe que puede perder los 1.000 € si el vendedor acepta y luego se echan atrás?"
          fieldKey="sabePierde1000" form={form} onChange={handleChange}
          hasError={!!errors.sabePierde1000} />

        <QuestionRow
          label="¿Sabe que las arras no se condicionan a la concesión de la hipoteca?"
          fieldKey="sabeArrasNoHipoteca" form={form} onChange={handleChange}
          hasError={!!errors.sabeArrasNoHipoteca} />
      </SectionCard>

      {/* ── DOCUMENTOS ── */}
      <SectionCard icon="📎" title="Documentos adjuntos">
        <p style={{ fontSize: 12, color: 'var(--gray-600)', marginBottom: 16 }}>
          Los tres documentos son <strong>obligatorios</strong>. Se adjuntarán al captador en Slack.
        </p>
        <div className={styles.fileSlots}>
          <FileUploadSlot label="Oferta" file={fileOferta}
            onFile={f => { setFileOferta(f); setErrors(p => ({ ...p, fileOferta: false })); }}
            hasError={!!errors.fileOferta} accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" />
          <FileUploadSlot label="Honorarios" file={fileHonorarios}
            onFile={f => { setFileHonorarios(f); setErrors(p => ({ ...p, fileHonorarios: false })); }}
            hasError={!!errors.fileHonorarios} accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" />
          <FileUploadSlot label="Justificante" file={fileJustificante}
            onFile={f => { setFileJustificante(f); setErrors(p => ({ ...p, fileJustificante: false })); }}
            hasError={!!errors.fileJustificante} accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" />
        </div>
      </SectionCard>

      <div className={styles.sendWrap}>
        <button type="button" className={styles.btnSend} onClick={handleSend} disabled={sending}>
          {sending ? '⏳ Enviando…' : '📤 Enviar al captador'}
        </button>
      </div>
    </div>
  );
}
