import Field from './Field';
import styles from './SettingsModal.module.css';

export default function SettingsModal({ slackToken, onTokenChange, agenteRemitente, onRemitenteChange, onClose }) {
  return (
    <div className={styles.overlay} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <span className={styles.modalTitle}>⚙️ Ajustes</span>
          <button className={styles.closeBtn} onClick={onClose} type="button">✕</button>
        </div>
        <div className={styles.modalBody}>
          <p className={styles.desc}>
            El token Slack se guarda en este dispositivo. Solo necesitas introducirlo una vez.
          </p>
          <div className={styles.fields}>
            <Field label="Token Slack Bot">
              <input
                type="password"
                value={slackToken}
                onChange={e => { onTokenChange(e.target.value); localStorage.setItem('rk_slack_token', e.target.value); }}
                placeholder="xoxb-..."
                autoComplete="off"
              />
            </Field>
            <Field label="Tu nombre (aparece en los envíos)">
              <input
                type="text"
                value={agenteRemitente}
                onChange={e => { onRemitenteChange(e.target.value); localStorage.setItem('rk_agente_remitente', e.target.value); }}
                placeholder="Ej: Almudena Gálvez"
              />
            </Field>
          </div>
          <div className={styles.hint}>
            Permisos necesarios para el bot: <code>chat:write</code>, <code>files:write</code>
          </div>
        </div>
        <div className={styles.modalFooter}>
          <button className={styles.btnDone} onClick={onClose} type="button">Guardar y cerrar</button>
        </div>
      </div>
    </div>
  );
}
