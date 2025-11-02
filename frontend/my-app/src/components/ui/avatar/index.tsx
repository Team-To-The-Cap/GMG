import styles from "./style.module.css";

const DEFAULT_AVATAR = "https://i.pravatar.cc/40?u=default"; // 혹은 /assets/default-avatar.png 등

export default function Avatar({
  src,
  alt,
  size = 32,
}: {
  src?: string | null;
  alt: string;
  size?: number;
}) {
  const imageSrc = src && src.trim() !== "" ? src : DEFAULT_AVATAR;

  return (
    <img
      className={styles.avatar}
      src={imageSrc}
      alt={alt}
      style={{ width: size, height: size }}
      onError={(e) => {
        // 이미지 로딩 실패 시에도 기본 이미지로 교체
        (e.currentTarget as HTMLImageElement).src = DEFAULT_AVATAR;
      }}
    />
  );
}
