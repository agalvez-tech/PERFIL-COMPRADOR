import Field from './Field';
import styles from './SettingsModal.module.css';

export default function SettingsModal({ agenteRemitente, onRemitenteChange, onClose }) {
  function handleAnthropicChange(val) {
    localStorage.setItem('rk_anthropic_key', val);
  }

  return (
    <div className={styles.overlay} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <span className={styles.modalTitle}>⚙️ Ajustes</span>
          <button className={styles.closeBtn} onClick={onClose} type="button">✕</button>
        </div>
        <div className={styles.modalBody}>
          <p className={styles.sectionLabel}>Tu nombre</p>
          <Field label="Tu nombre (aparece en los envíos)">
            <input type="text" value={agenteRemitente}
              onChange={e => { onRemitenteChange(e.target.value); localStorage.setItem('rk_agente_remitente', e.target.value); }}
              placeholder="Ej: Almudena Gálvez" />
          </Field>

          <p className={styles.sectionLabel} style={{ marginTop: 8 }}>Extracción con IA</p>
          <p className={styles.desc}>API Key de Anthropic para leer la propuesta automáticamente.</p>
          <Field label="API Key Anthropic">
            <input type="password"
              defaultValue={localStorage.getItem('rk_anthropic_key') || ''}
              onChange={e => handleAnthropicChange(e.target.value)}
              placeholder="sk-ant-..." autoComplete="off" />
          </Field>
        </div>
        <div className={styles.modalFooter}>
          <button className={styles.btnDone} onClick={onClose} type="button">Guardar y cerrar</button>
        </div>
      </div>
    </div>
  );
}
