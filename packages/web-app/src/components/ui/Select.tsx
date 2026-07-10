import React from 'react';
import styles from './Select.module.css';

interface SelectOption {
  value: string | number;
  label: string;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  options: SelectOption[];
}

export const Select: React.FC<SelectProps> = ({
  label,
  error,
  hint,
  options,
  id,
  className = '',
  ...props
}) => {
  const selectId = id || label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className={`${styles.field} ${error ? styles.hasError : ''}`}>
      {label && (
        <label className={styles.label} htmlFor={selectId}>
          {label}
          {props.required && <span className={styles.required}>*</span>}
        </label>
      )}
      <div className={styles.wrapper}>
        <select
          id={selectId}
          className={`${styles.select} ${className}`}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <span className={styles.chevron} aria-hidden="true">▾</span>
      </div>
      {error && <p className={styles.error} role="alert">{error}</p>}
      {hint && !error && <p className={styles.hint}>{hint}</p>}
    </div>
  );
};
