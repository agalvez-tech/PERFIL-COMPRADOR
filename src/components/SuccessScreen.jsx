import styles from './SuccessScreen.module.css';

export default function SuccessScreen({ captador, isDownload, onReset, customTitle, customDesc }) {
  const title = customTitle || (isDownload ? '¡Documento generado!' : '¡Enviado!');
  const desc = customDesc || (isDownload
    ? 'El PDF se ha descargado en tu dispositivo.'
    : 'El documento ha sido enviado al captador por Slack.');

  return (
    <div className={styles.wrap}>
      <div className={styles.icon}>{isDownload ? '📄' : '✅'}</div>
      <h2 className={styles.title}>{title}</h2>
      <p className={styles.desc}>{desc}</p>

      {!isDownload && captador && (
        <div className={styles.badge}>
          <div className={styles.badgeAvatar}>{captador.initials}</div>
          <span>Enviado a {captador.name}</span>
        </div>
      )}

      <button className={styles.btnNew} onClick={onReset} type="button">
        {isDownload ? 'Nueva propuesta' : 'Nuevo perfil'}
      </button>
    </div>
  );
}
