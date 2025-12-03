// @ts-nocheck
// src/pages/participants/search-origin/index.tsx
import { useEffect, useRef, useState, useMemo } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Search, MapPin } from "lucide-react";
import styles from "./style.module.css";

import type { ParticipantLocationState } from "@/types/participant";
import { addMustVisitPlace } from "@/services/promise/promise.service";

// 🔹 새 참가자별 출발지 스토리지 유틸
import {
  loadParticipantPlaces,
  saveParticipantPlaces,
  type StoredParticipantPlace as SavedPlace,
} from "@/utils/participant-place-storage";

const API_BASE = import.meta.env.VITE_API_BASE_URL;

// 🔹 참가자별 저장소에서도 최대 몇 개까지 유지할지 (MyPage 쪽과 맞춤)
const MAX_SAVED_PLACES = 3;

type Item = {
  title: string;
  name: string;
  address: string;
  roadAddress?: string | null;
  category?: string | null;
  telephone?: string | null;
};

export default function SearchOriginPage() {
  const navigate = useNavigate();
  const { promiseId } = useParams();
  const location = useLocation();
  const baseState = (location.state || {}) as ParticipantLocationState & {
    participantDraftId?: string | null;
    savedPlaces?: SavedPlace[];
  };

  const [q, setQ] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  const effectivePromiseId = promiseId ?? "no-meeting";

  const onBack = () => navigate(-1);

  // 🔹 지금 URL이 must-visit 검색인지 여부 (예: /details/:id/must-visit/search)
  const isMustVisitMode = useMemo(
    () => location.pathname.includes("/must-visit/"),
    [location.pathname]
  );

  // ───────────────── 참가자별 storage ID 계산 (state만 사용) ─────────────────
  const participantStorageId = useMemo(() => {
    if (baseState.editParticipantId != null) {
      return `id-${baseState.editParticipantId}`;
    }
    if (baseState.participantDraftId) {
      return baseState.participantDraftId;
    }
    return "draft-unknown";
  }, [baseState.editParticipantId, baseState.participantDraftId]);

  // ───────────────── 디바운스 검색 ─────────────────
  useEffect(() => {
    if (!q.trim()) {
      setItems([]);
      setErr(null);
      if (abortRef.current) abortRef.current.abort();
      return;
    }

    const t = setTimeout(async () => {
      try {
        if (abortRef.current) abortRef.current.abort();
        abortRef.current = new AbortController();
        setLoading(true);
        setErr(null);

        const res = await fetch(
          `${API_BASE}/api/search/places?q=${encodeURIComponent(q)}`,
          {
            signal: abortRef.current.signal,
          }
        );
        if (!res.ok) throw new Error(await res.text());
        const data = (await res.json()) as { items: Item[] };
        setItems(data.items);
      } catch (e: any) {
        if (e.name !== "AbortError") setErr("검색 중 오류가 발생했어요.");
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(t);
  }, [q]);

  // ───────────────── 검색 결과 선택 ─────────────────
  const selectItem = async (it: Item) => {
    const label = it.name || it.title;
    const addr = it.roadAddress || it.address || "";

    const place: SavedPlace = {
      id: `${label}-${addr}`,
      name: label,
      address: addr,
    };

    const segments = location.pathname.split("/");
    const mode = segments[1]; // 'details' 또는 'create'

    // ✅ 1) must-visit 모드: 서버에 저장 후 약속 메인 화면으로 복귀
    if (isMustVisitMode) {
      if (!promiseId) return;

      const basePath = promiseId && mode ? `/${mode}/${promiseId}` : "/";

      try {
        await addMustVisitPlace(promiseId, {
          name: label,
          address: addr || undefined,
        });
      } catch (e: any) {
        console.error(e);
        alert("반드시 가고 싶은 장소 저장 중 오류가 발생했어요.");
      }

      navigate(basePath, {
        replace: true,
      });
      return;
    }

    // ✅ 2) 기존 참가자 출발지 플로우 (participants/new/origin으로 복귀)
    const originPath = promiseId
      ? `/${mode}/${promiseId}/participants/new/origin`
      : `/participants/new/origin`;

    // 🔹 이전 목록: state 우선, 없으면 "해당 참가자용 localStorage" 사용
    const prevSaved: SavedPlace[] =
      baseState.savedPlaces && baseState.savedPlaces.length
        ? baseState.savedPlaces
        : loadParticipantPlaces(effectivePromiseId, participantStorageId);

    // 🔹 중복 제거 후 맨 앞에 새 place 추가
    let nextSaved = prevSaved.filter((p) => p.id !== place.id);
    nextSaved.unshift(place);

    // 🔹 최대 MAX_SAVED_PLACES 까지만 유지
    if (nextSaved.length > MAX_SAVED_PLACES) {
      nextSaved = nextSaved.slice(0, MAX_SAVED_PLACES);
    }

    // 🔹 참가자별 localStorage 에도 반영
    saveParticipantPlaces(effectivePromiseId, participantStorageId, nextSaved);

    navigate(originPath, {
      replace: true,
      state: {
        ...baseState,
        selectedOrigin: place,
        savedPlaces: nextSaved, // ✅ 참가자 전용 리스트
        // 돌아가서도 같은 참가자로 인식하도록
        participantDraftId:
          baseState.participantDraftId ?? participantStorageId,
      },
    });
  };

  return (
    <div className={styles.page}>
      <div className={styles.searchWrap}>
        <div className={styles.searchField}>
          <Search className={styles.searchIcon} size={18} />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="장소명이나 주소를 검색하세요"
            className={styles.searchInput}
          />
        </div>
      </div>

      <div className={styles.scroll}>
        {loading && <div className={styles.state}>검색 중…</div>}
        {err && <div className={styles.state}>{err}</div>}
        {!loading && !err && q.trim() && items.length === 0 && (
          <div className={styles.state}>검색 결과가 없어요.</div>
        )}

        <ul className={styles.list}>
          {items.map((it, i) => (
            <li
              key={`${it.name}-${i}`}
              className={styles.item}
              onClick={() => selectItem(it)}
            >
              <div className={styles.itemIcon}>
                <MapPin size={18} />
              </div>
              <div className={styles.itemTexts}>
                <div className={styles.itemName}>{it.name || it.title}</div>
                <div className={styles.itemAddr}>
                  {it.roadAddress || it.address}
                </div>
                {it.category && (
                  <div className={styles.itemCat}>{it.category}</div>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
