import React, { useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { MapPin, ChevronRight, CheckCircle2 } from "lucide-react"; // ⬅️ 체크 아이콘 추가
import TopBar from "@/components/ui/top-bar";
import Button from "@/components/ui/button";
import styles from "./style.module.css";

import { loadSavedPlaces, type SavedPlace } from "@/lib/user-storage";

type LocationState = {
  savedPlaces?: SavedPlace[];
  nameDraft?: string;
};

export default function AddParticipantOriginPage() {
  const navigate = useNavigate();
  const { promiseId } = useParams();
  const location = useLocation();
  const state = (location.state || {}) as LocationState;

  // 저장된 장소
  const saved = useMemo<SavedPlace[]>(() => {
    if (state.savedPlaces && state.savedPlaces.length) return state.savedPlaces;
    return loadSavedPlaces();
  }, [state.savedPlaces]);

  // ✅ 선택 상태
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedPlace = useMemo(
    () => saved.find((p) => p.id === selectedId) || null,
    [saved, selectedId]
  );

  const onBack = () => navigate(-1);

  // 리스트 아이템 클릭 → 선택/해제
  const toggleSelect = (p: SavedPlace) => {
    setSelectedId((cur) => (cur === p.id ? null : p.id));
  };

  // “장소 선택하기”(검색 페이지로 이동)
  const openSearch = () => {
    const path = promiseId
      ? `/create/${promiseId}/participants/new/origin/search`
      : `/participants/new/origin/search`;
    navigate(path, { state });
  };

  const openAll = () => {
    alert("전체보기로 이동 (라우트 연결 예정)");
  };

  // ✅ 확인 버튼: 선택된 장소를 이전 페이지로 반환
  const onConfirm = () => {
    if (!selectedPlace) return;
    navigate(-1, { state: { selectedOrigin: selectedPlace.name } });
  };

  return (
    <div className={styles.page}>
      <TopBar title="출발장소 선택" onBack={onBack} />

      <div className={styles.scroll}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTitle}>저장된 장소</span>
          <button className={styles.linkBtn} onClick={openAll}>전체보기</button>
        </div>

        <ul className={styles.list}>
          {saved.map((p) => {
            const active = selectedId === p.id;
            return (
              <li
                key={p.id}
                className={`${styles.item} ${active ? styles.itemSelected : ""}`}
                onClick={() => toggleSelect(p)}
                role="button"
                aria-pressed={active}
                tabIndex={0}
              >
                <div className={`${styles.itemIcon} ${active ? styles.itemIconActive : ""}`}>
                  <MapPin size={20} />
                </div>
                <div className={styles.itemTexts}>
                  <div className={styles.itemName}>{p.name}</div>
                  <div className={styles.itemAddr}>{p.address}</div>
                </div>

                {/* 오른쪽: 선택 시 체크, 아니면 > 아이콘 */}
                <div className={styles.itemRight}>
                  {active ? (
                    <CheckCircle2 className={styles.checkIcon} size={20} />
                  ) : (
                    <ChevronRight size={18} />
                  )}
                </div>
              </li>
            );
          })}

          {!saved.length && (
            <li className={styles.item} aria-disabled>
              <div className={styles.itemTexts}>
                <div className={styles.itemName}>저장된 장소가 없어요</div>
                <div className={styles.itemAddr}>
                  마이페이지에서 추가하거나 아래 ‘장소 선택하기’를 눌러 검색하세요
                </div>
              </div>
            </li>
          )}
        </ul>

        <div className={styles.gap} />

        <button className={styles.bigSelect} onClick={openSearch}>
          <div className={styles.bigIcon}><MapPin size={24} /></div>
          <div className={styles.bigTitle}>장소 선택하기</div>
          <div className={styles.bigSub}>저장된 장소 또는 검색으로 선택</div>
        </button>
      </div>

      {/* ✅ 하단 고정: 취소 / 확인 */}
      <div className={styles.footerRow}>
        <Button variant="ghost" size="md" onClick={onBack}>
          취소
        </Button>
        <Button
          variant="primary"
          size="md"
          onClick={onConfirm}
          disabled={!selectedPlace}
          className={styles.confirmBtn}
        >
          확인
        </Button>
      </div>
    </div>
  );
}
