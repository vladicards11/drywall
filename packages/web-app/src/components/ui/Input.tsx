import React from 'react';
import styles from './Input.module.css';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  suffix?: string;
  prefix?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  hint,
  suffix,
  prefix,
  id,
  className = '',
  ...props
}) => {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className={`${styles.field} ${error ? styles.hasError : ''}`}>
      {label && (
        <label className={styles.label} htmlFor={inputId}>
          {label}
          {props.required && <span className={styles.required}>*</span>}
        </label>
      )}
      <div className={styles.inputWrapper}>
        {prefix && <span className={styles.prefix}>{prefix}</span>}
        <input
          id={inputId}
          className={`${styles.input} ${prefix ? styles.withPrefix : ''} ${suffix ? styles.withSuffix : ''} ${className}`}
          {...props}
        />
        {suffix && <span className={styles.suffix}>{suffix}</span>}
      </div>
      {error && <p className={styles.error} role="alert">{error}</p>}
      {hint && !error && <p className={styles.hint}>{hint}</p>}
    </div>
  );
};
