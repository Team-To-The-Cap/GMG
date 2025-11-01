import styles from "./style.module.css";

export default function Avatar({
  src,
  alt,
  size = 28,
}: {
  src: string;
  alt: string;
  size?: number;
}) {
  return (
    <img
      className={styles.avatar}
      src={src}
      alt={alt}
      style={{ width: size, height: size }}
    />
  );
}
