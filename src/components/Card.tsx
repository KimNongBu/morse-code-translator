/**
 * 모든 패널에서 공통으로 쓰는 카드 레이아웃.
 * 제목 / 부제 / 우측 액션 영역 / 본문 슬롯을 제공한다.
 */

import { memo } from 'react';
import type { ReactNode } from 'react';

import styles from './Card.module.css';

export interface CardProps {
  /** 카드 제목 (대문자 라벨 스타일로 표시된다) */
  title: string;
  /** 제목 왼쪽에 붙는 모스부호 장식 (예: `.-`) */
  badge?: string;
  /** 제목 아래 보조 설명 */
  subtitle?: string;
  /** 헤더 우측 액션 영역 */
  actions?: ReactNode;
  /** 카드 본문 */
  children: ReactNode;
  /** 추가 클래스 (레이아웃 조정용) */
  className?: string;
}

function CardComponent({
  title,
  badge,
  subtitle,
  actions,
  children,
  className,
}: CardProps) {
  return (
    <section className={className ? `${styles.card} ${className}` : styles.card}>
      <header className={styles.header}>
        <div className={styles.titleGroup}>
          <h2 className={styles.title}>
            {badge !== undefined && <span className={styles.badge}>{badge}</span>}
            {title}
          </h2>
          {subtitle !== undefined && <p className={styles.subtitle}>{subtitle}</p>}
        </div>
        {actions !== undefined && <div className={styles.actions}>{actions}</div>}
      </header>

      <div className={styles.body}>{children}</div>
    </section>
  );
}

/** 부모 리렌더링 시 props가 같으면 다시 그리지 않는다. */
export const Card = memo(CardComponent);
