/**
 * 앱 전체에서 재사용하는 버튼.
 * 외부 UI 라이브러리를 쓰지 않으므로 variant 기반으로 직접 스타일을 관리한다.
 */

import { memo } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

import styles from './Button.module.css';

/** 버튼 시각 변형 */
export type ButtonVariant = 'default' | 'primary' | 'danger' | 'quiet';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** 시각 변형 */
  variant?: ButtonVariant;
  /** 텍스트 앞에 붙는 아이콘(이모지/문자) */
  icon?: string;
  /** 눌린 듯한 활성 상태 (재생 중 표시 등) */
  isActive?: boolean;
  children: ReactNode;
}

/** variant 이름 -> CSS Module 클래스 매핑 */
const VARIANT_CLASS: Record<ButtonVariant, string> = {
  default: '',
  primary: styles.primary,
  danger: styles.danger,
  quiet: styles.quiet,
};

function ButtonComponent({
  variant = 'default',
  icon,
  isActive = false,
  children,
  className,
  type = 'button',
  ...rest
}: ButtonProps) {
  const classNames = [styles.button, VARIANT_CLASS[variant], isActive ? styles.active : '', className]
    .filter((name): name is string => Boolean(name))
    .join(' ');

  return (
    <button type={type} className={classNames} {...rest}>
      {icon !== undefined && (
        <span className={styles.icon} aria-hidden="true">
          {icon}
        </span>
      )}
      {children}
    </button>
  );
}

export const Button = memo(ButtonComponent);
