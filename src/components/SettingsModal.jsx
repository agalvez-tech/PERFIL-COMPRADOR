import Field from './Field';
import styles from './SettingsModal.module.css';

export default function SettingsModal({ slackToken, onTokenChange, agenteRemitente, onRemitenteChange, onClose }) {
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
          <p className={styles.sectionLabel}>Slack</p>
          <p className={styles.desc}>El token se guarda en este dispositivo. Solo necesitas introducirlo una vez.</p>
          <Field label="Token Slack Bot">
            <input type="password" value={slackToken}
              onChange={e => { onTokenChange(e.target.value); localStorage.setItem('rk_slack_token', e.target.value); }}
              placeholder="xoxb-..." autoComplete="off" />
          </Field>
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

          <div className={styles.hint}>
            Permisos Slack: <code>chat:write</code>, <code>files:write</code>
          </div>
        </div>
        <div className={styles.modalFooter}>
          <button className={styles.btnDone} onClick={onClose} type="button">Guardar y cerrar</button>
        </div>
      </div>
    </div>
  );
}
