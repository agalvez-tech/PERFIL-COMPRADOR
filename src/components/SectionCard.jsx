import styles from './SectionCard.module.css';

export default function SectionCard({ icon, title, extra, children }) {
  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <span className={styles.icon}>{icon}</span>
        <span className={styles.title}>{title}</span>
        {extra && <span className={styles.extra}>{extra}</span>}
      </div>
      <div className={styles.body}>{children}</div>
    </div>
  );
}
