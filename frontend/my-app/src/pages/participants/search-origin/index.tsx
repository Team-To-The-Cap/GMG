// src/pages/participants/serach-origin/index.tsx
import React, { useEffect, useRef, useState } from "react"; 
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Search, MapPin } from "lucide-react";
import TopBar from "@/components/ui/top-bar";
import styles from "./style.module.css";
import type { SavedPlace } from "@/lib/user-storage";

type Item = {
  title: string;
  name: string;
  address: string;
  roadAddress?: string | null;
  category?: string | null;
  telephone?: string | null;
};

type LocationState = {
  savedPlaces?: SavedPlace[];
  nameDraft?: string;
  selectedOrigin?: SavedPlace | null;
};

export default function SearchOriginPage() {
  const navigate = useNavigate();
  const { promiseId } = useParams();
  const location = useLocation();
  const baseState = (location.state || {}) as LocationState;

  const [q, setQ] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  const onBack = () => navigate(-1);

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
          `/api/search/places?q=${encodeURIComponent(q)}`,
          { signal: abortRef.current.signal }
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
  const selectItem = (it: Item) => {
    const label = it.name || it.title;
    const addr = it.roadAddress || it.address || "";

    const place: SavedPlace = {
      // TODO: 실제 서비스에서는 고유 id 로 바꾸기
      id: `${label}-${addr}`,
      name: label,
      address: addr,
    };

    const originPath = promiseId
      ? `/create/${promiseId}/participants/new/origin`
      : `/participants/new/origin`;

    // 숫자 -1 이 아니라, 출발장소 선택 페이지로 "직접" 이동하면서 state 전달
    navigate(originPath, {
      replace: true,
      state: {
        ...baseState,
        selectedOrigin: place,
      },
    });
  };

  return (
    <div className={styles.page}>
      <TopBar title="장소 검색" onBack={onBack} />

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
