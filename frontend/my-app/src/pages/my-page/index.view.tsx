// src/pages/mypage/index.view.tsx
import styles from "./style.module.css";
import PreferenceChip from "@/components/ui/preference-chip";
import { PinIcon2, TrashIcon } from "@/assets/icons/icons";
import { useRef } from "react";

type CatVM = { key: string; label: string; emoji: string; selected: boolean };

type Props = {
  title: string;
  description: string;

  profile: { name: string; avatarUrl?: string };
  onProfileEdit: (next: Partial<Props["profile"]>) => void;

  placeName: string;
  onChangePlaceName: (v: string) => void;
  placeQuery: string;
  onChangePlaceQuery: (v: string) => void;
  onAddPlace: () => void;

  places: { id: string; name: string; address: string }[];
  onRemovePlace: (id: string) => void;

  categories: CatVM[];
  onToggleCategory: (key: string) => void;

  onSave: () => void;
};

export default function MyPageView({
  title,
  description,
  profile,
  onProfileEdit,
  placeName,
  onChangePlaceName,
  placeQuery,
  onChangePlaceQuery,
  onAddPlace,
  places = [],
  onRemovePlace,
  categories = [],
  onToggleCategory,
  onSave,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);

  const onPickAvatar = () => fileRef.current?.click();
  const onChangeFile: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => onProfileEdit({ avatarUrl: String(reader.result) });
    reader.readAsDataURL(f);
  };

  return (
    <div className={styles.page}>
      {/* 상단 헤더: 홈 화면과 유사한 톤 */}
      <section className={styles.headerSection}>
        <button
          type="button"
          className={styles.headerAvatarBtn}
          onClick={onPickAvatar}
          title="프로필 사진 변경"
        >
          {profile.avatarUrl ? (
            <img
              src={profile.avatarUrl}
              alt="avatar"
              className={styles.headerAvatarImg}
            />
          ) : (
            <div className={styles.headerAvatarFallback}>{profile.name[0]}</div>
          )}
        </button>
        <div className={styles.headerTexts}>
          <div className={styles.headerTextMain}>
            {profile.name}님, 반가워요 👋
          </div>
          <div className={styles.headerTextSub}>{description}</div>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={onChangeFile}
        />
      </section>

      {/* 프로필 카드 */}
      <section className={styles.cardSection}>
        <div className={styles.cardHeader}>
          <h3 className={styles.cardTitle}>프로필</h3>
          <button
            type="button"
            className={styles.cardHeaderBtn}
            onClick={() => {
              const next = prompt("이름을 수정할게요", profile.name);
              if (next && next.trim()) onProfileEdit({ name: next.trim() });
            }}
          >
            프로필 수정
          </button>
        </div>

        <div className={styles.profileRow}>
          <div className={styles.profileTextBlock}>
            <div className={styles.profileName}>{profile.name}</div>
            <p className={styles.profileHint}>
              나의 이름과 프로필 사진은 약속 참여자들에게 보여져요.
            </p>
          </div>
        </div>
      </section>

      {/* 자주 가는 장소 등록 */}
      <section className={styles.cardSection}>
        <div className={styles.cardHeader}>
          <h3 className={styles.cardTitle}>자주 가는 장소</h3>
          {places.length > 0 && (
            <span className={styles.cardBadge}>{places.length}곳 저장됨</span>
          )}
        </div>

        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>장소 이름</label>
          <input
            className={styles.fieldInput}
            placeholder="예) 카페 어라운드"
            value={placeName}
            onChange={(e) => onChangePlaceName(e.target.value)}
          />
        </div>

        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>
            주소 또는 지도 검색 키워드
          </label>
          <input
            className={styles.fieldInput}
            placeholder="예) 서울 마포구 ..."
            value={placeQuery}
            onChange={(e) => onChangePlaceQuery(e.target.value)}
          />
        </div>

        <button
          type="button"
          className={styles.subPrimaryBtn}
          onClick={onAddPlace}
        >
          + 장소 추가하기
        </button>

        <div className={styles.placeList}>
          {places.map((p) => (
            <div key={p.id} className={styles.placeCard}>
              <div className={styles.placeIcon} aria-hidden>
                <PinIcon2 className={styles.pinSvg} />
              </div>
              <div className={styles.placeTexts}>
                <div className={styles.placeName}>{p.name}</div>
                <div className={styles.placeAddr}>{p.address}</div>
              </div>
              <button
                className={styles.trashBtn}
                onClick={() => onRemovePlace(p.id)}
                aria-label="삭제"
                type="button"
              >
                <TrashIcon className={styles.trashSvg} />
              </button>
            </div>
          ))}
          {!places.length && (
            <div className={styles.empty}>
              아직 등록된 장소가 없어요.
              <br />
              자주 만나는 장소를 등록해두면 약속 만들 때 더 편리해요.
            </div>
          )}
        </div>
      </section>

      {/* 선호 카테고리 */}
      <section className={styles.cardSection}>
        <div className={styles.cardHeader}>
          <h3 className={styles.cardTitle}>선호하는 장소 유형</h3>
        </div>
        <p className={styles.cardDescription}>
          최대 <span className={styles.accent}>4개까지</span> 선택할 수 있어요.
          선택한 유형을 기반으로 만남 장소 추천에 활용돼요.
        </p>

        <div className={styles.emojiGrid}>
          {categories.map((c) => (
            <PreferenceChip
              key={c.key}
              label={c.label}
              emoji={c.emoji}
              selected={c.selected}
              variant="stack"
              onClick={() => onToggleCategory(c.key)}
            />
          ))}
        </div>
      </section>

      {/* 하단 저장 바 */}
      <div className={styles.saveBar}>
        <button type="button" className={styles.primaryBtn} onClick={onSave}>
          변경사항 저장하기
        </button>
      </div>
    </div>
  );
}
