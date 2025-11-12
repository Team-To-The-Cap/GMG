// src/pages/participants/add-origin/index.tsx
import React, { useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { MapPin, ChevronRight, CheckCircle2 } from "lucide-react";
import TopBar from "@/components/ui/top-bar";
import Button from "@/components/ui/button";
import styles from "./style.module.css";

import { loadSavedPlaces, type SavedPlace } from "@/lib/user-storage";

type LocationState = {
  savedPlaces?: SavedPlace[];
  nameDraft?: string;
  selectedOrigin?: SavedPlace | null;
};

export default function AddParticipantOriginPage() {
  const navigate = useNavigate();
  const { promiseId } = useParams();
  const location = useLocation();
  const state = (location.state || {}) as LocationState;

  // ───────────────── 저장된 장소 ─────────────────
  const baseSaved = useMemo<SavedPlace[]>(() => {
    if (state.savedPlaces && state.savedPlaces.length) return state.savedPlaces;
    return loadSavedPlaces();
  }, [state.savedPlaces]);

  // 검색 화면 등에서 돌아온 선택 결과
  const externalSelected = state.selectedOrigin ?? null;

  // 최종 리스트: externalSelected 가 saved 에 없으면 맨 위에 추가
  const saved = useMemo<SavedPlace[]>(() => {
    if (!externalSelected) return baseSaved;
    const exists = baseSaved.some((p) => p.id === externalSelected.id);
    if (exists) return baseSaved;
    return [externalSelected, ...baseSaved];
  }, [baseSaved, externalSelected]);

  // 선택 상태 (초기값: 외부에서 넘어온 selectedOrigin)
  const [selectedId, setSelectedId] = useState<string | null>(
    externalSelected?.id ?? null
  );

  const selectedPlace = useMemo(
    () => saved.find((p) => p.id === selectedId) || null,
    [saved, selectedId]
  );

  const onBack = () => navigate(-1);

  const toggleSelect = (p: SavedPlace) => {
    setSelectedId((cur) => (cur === p.id ? null : p.id));
  };

  // ───────────────── “장소 선택하기” → 검색 페이지 ─────────────────
  const openSearch = () => {
    const path = promiseId
      ? `/create/${promiseId}/participants/new/origin/search`
      : `/participants/new/origin/search`;

    navigate(path, {
      replace: true,
      state: {
        ...state,
        savedPlaces: baseSaved,
        // 현재까지 선택된 값 유지해서 넘겨주기
        selectedOrigin: selectedPlace ?? externalSelected ?? null,
      },
    });
  };

  const openAll = () => {
    alert("전체보기로 이동 (라우트 연결 예정)");
  };

  // ───────────────── 확인 버튼: 이전 페이지로 선택 결과 반환 ─────────────────
  const onConfirm = () => {
    if (!selectedPlace) return;

    navigate(-1, {
      state: {
        ...state,
        selectedOrigin: selectedPlace, // SavedPlace 전체 반환
      },
    });
  };

  return (
    <div className={styles.page}>
      <div className={styles.scroll}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTitle}>저장된 장소</span>
          <button className={styles.linkBtn} onClick={openAll}>
            <span>전체보기</span>
            <ChevronRight size={14} />
          </button>
        </div>

        <ul className={styles.list}>
          {saved.map((p) => {
            const active = selectedId === p.id;
            return (
              <li
                key={p.id}
                className={`${styles.item} ${
                  active ? styles.itemSelected : ""
                }`}
                onClick={() => toggleSelect(p)}
                role="button"
                aria-pressed={active}
                tabIndex={0}
              >
                <div
                  className={`${styles.itemIcon} ${
                    active ? styles.itemIconActive : ""
                  }`}
                >
                  <MapPin size={20} />
                </div>
                <div className={styles.itemTexts}>
                  <div className={styles.itemName}>{p.name}</div>
                  <div className={styles.itemAddr}>{p.address}</div>
                </div>

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
                  마이페이지에서 추가하거나 아래 ‘장소 선택하기’를 눌러
                  검색하세요
                </div>
              </div>
            </li>
          )}
        </ul>

        <div className={styles.gap} />

        {/* 장소 선택하기 카드 */}
        <button className={styles.bigSelect} onClick={openSearch}>
          <div className={styles.bigIcon}>
            <MapPin size={24} />
          </div>

          <div className={styles.bigTexts}>
            <div className={styles.bigTitle}>장소 선택하기</div>
            <div className={styles.bigSub}>저장된 장소 또는 검색으로 선택</div>
          </div>

          <div className={styles.itemRight}>
            <ChevronRight size={18} />
          </div>
        </button>
      </div>

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
