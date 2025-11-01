import type { ReactNode } from "react";
import styles from "./style.module.css";

type CardProps = { className?: string; children?: ReactNode };

export default function Card({ className, children }: CardProps) {
  return (
    <section className={[styles.card, className].filter(Boolean).join(" ")}>
      {children}
    </section>
  );
}
