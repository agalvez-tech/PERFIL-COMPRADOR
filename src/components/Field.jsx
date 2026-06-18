import styles from './Field.module.css';

export default function Field({ label, required, hint, children }) {
  return (
    <div className={styles.field}>
      {label && (
        <label className={styles.label}>
          {label}
          {required && <span className={styles.req}> *</span>}
        </label>
      )}
      {children}
      {hint && <span className={styles.hint}>{hint}</span>}
    </div>
  );
}
