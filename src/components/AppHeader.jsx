import { useState } from 'react';
import SettingsModal from './SettingsModal';
import styles from './AppHeader.module.css';

export default function AppHeader({ slackToken, onTokenChange, agenteRemitente, onRemitenteChange }) {
  const [showSettings, setShowSettings] = useState(false);

  return (
    <>
      <header className={styles.header}>
        <div className={styles.inner}>
          <div className={styles.left}>
            <div className={styles.logoMark}>RK</div>
            <div className={styles.titles}>
              <span className={styles.brand}>RK Palanca Fontestad</span>
              <span className={styles.subtitle}>Perfil del Comprador</span>
            </div>
          </div>
          <button
            className={styles.settingsBtn}
            onClick={() => setShowSettings(true)}
            type="button"
            title="Ajustes Slack"
          >
            ⚙️
          </button>
        </div>
      </header>

      {showSettings && (
        <SettingsModal
          slackToken={slackToken}
          onTokenChange={onTokenChange}
          agenteRemitente={agenteRemitente}
          onRemitenteChange={onRemitenteChange}
          onClose={() => setShowSettings(false)}
        />
      )}
    </>
  );
}
