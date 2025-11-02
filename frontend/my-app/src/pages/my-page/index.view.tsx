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
  title, description,
  profile, onProfileEdit,
  placeName, onChangePlaceName,
  placeQuery, onChangePlaceQuery,
  onAddPlace,
  places, onRemovePlace,
  categories, onToggleCategory,
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
      <h1 className={styles.title}>{title}</h1>
      <p className={styles.desc}>{description}</p>

      {/* 프로필 */}
      <section className={styles.section}>
        <div className={styles.profile}>
          <button className={styles.avatarBtn} onClick={onPickAvatar} title="프로필 사진 변경">
            <img
              src={profile.avatarUrl || "https://i.pravatar.cc/100?u=placeholder"}
              alt="avatar"
              className={styles.avatar}
            />
          </button>
          <div className={styles.profileTexts}>
            <div className={styles.name}>{profile.name}</div>
            <button
              className={styles.editBtn}
              onClick={() => {
                const next = prompt("이름 수정", profile.name);
                if (next) onProfileEdit({ name: next });
              }}
            >
              프로필 수정
            </button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={onChangeFile}
          />
        </div>
      </section>

      {/* 자주 가는 장소 등록 */}
      <section className={styles.section}>
        <h3 className={styles.h3}>자주 가는 장소 등록</h3>

        <label className={styles.inputLabel}>장소 이름 입력</label>
        <input
          className={styles.input}
          placeholder="예) 카페 어라운드"
          value={placeName}
          onChange={(e) => onChangePlaceName(e.target.value)}
        />

        <label className={styles.inputLabel}>주소 또는 지도 검색</label>
        <input
          className={styles.input}
          placeholder="예) 서울 마포구 ..."
          value={placeQuery}
          onChange={(e) => onChangePlaceQuery(e.target.value)}
        />

        <button className={styles.primaryBtn} onClick={onAddPlace}>+ 추가하기</button>
      </section>

      {/* 저장된 장소 리스트 */}
      <section className={styles.section}>
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
              title="삭제"
            >
              <TrashIcon className={styles.trashSvg} />
            </button>
          </div>
        ))}
        {!places.length && <div className={styles.empty}>아직 등록된 장소가 없어요.</div>}
      </section>

      {/* 선호 카테고리 */}
      <section className={styles.section}>
        <h3 className={styles.h3}>
          내가 선호하는 장소 유형 <em className={styles.helper}>최대 4개까지 선택 가능합니다.</em>
        </h3>
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

      <div className={styles.saveBar}>
        <button className={styles.primaryBtn} onClick={onSave}>저장하기</button>
      </div>
    </div>
  );
}
