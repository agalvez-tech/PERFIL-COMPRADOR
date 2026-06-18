import { useState } from 'react';
import AppHeader from './components/AppHeader';
import SuccessScreen from './components/SuccessScreen';
import PerfilComprador from './components/PerfilComprador';
import styles from './App.module.css';

export default function App() {
  const [slackToken, setSlackToken] = useState(() => localStorage.getItem('rk_slack_token') || '');
  const [agenteRemitente, setAgenteRemitente] = useState(() => localStorage.getItem('rk_agente_remitente') || '');
  const [done, setDone] = useState(false);
  const [captador, setCaptador] = useState(null);

  function handleTokenChange(val) {
    setSlackToken(val);
    localStorage.setItem('rk_slack_token', val);
  }

  function handleRemitenteChange(val) {
    setAgenteRemitente(val);
    localStorage.setItem('rk_agente_remitente', val);
  }

  function handleSuccess(cap) {
    setCaptador(cap);
    setDone(true);
  }

  function reset() {
    setDone(false);
    setCaptador(null);
    window.scrollTo(0, 0);
  }

  return (
    <>
      <AppHeader
        slackToken={slackToken}
        onTokenChange={handleTokenChange}
        agenteRemitente={agenteRemitente}
        onRemitenteChange={handleRemitenteChange}
      />

      {done ? (
        <SuccessScreen
          captador={captador}
          isDownload={false}
          onReset={reset}
          customTitle="¡Perfil enviado!"
          customDesc="El perfil del comprador y los documentos han sido enviados al captador por Slack."
        />
      ) : (
        <main className={styles.main}>
          <div className={styles.pageHeader}>
            <h1 className={styles.pageTitle}>Perfil del Comprador</h1>
            <p className={styles.pageDesc}>
              Rellena el perfil y el checklist. Al pulsar enviar, el captador recibirá toda la información y los documentos por Slack.
            </p>
          </div>
          <PerfilComprador
            slackToken={slackToken}
            agenteRemitente={agenteRemitente}
            onSuccess={handleSuccess}
          />
        </main>
      )}
    </>
  );
}
