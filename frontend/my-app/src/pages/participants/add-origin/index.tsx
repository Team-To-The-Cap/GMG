// src/pages/participants/add-origin/index.tsx
import { useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { MapPin, ChevronRight, CheckCircle2 } from "lucide-react"; // ⬅️ 체크 아이콘 추가
import Button from "@/components/ui/button";

import { loadSavedPlaces, type SavedPlace } from "@/lib/user-storage";

type LocationState = {
  savedPlaces?: SavedPlace[];
  nameDraft?: string;
  selectedOrigin?: SavedPlace | null;
  selectedTransportation?: string | null;
};

export default function AddParticipantOriginPage() {
  const navigate = useNavigate();
  const { promiseId } = useParams();
  const location = useLocation();
  const state = (location.state || {}) as LocationState;
  const nameDraft = state?.nameDraft ?? "";

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

  const [transportation, setTransportation] = useState<string>(
    state.selectedTransportation ?? "대중교통"
  );

  const onBack = () => navigate(-1);

  const toggleSelect = (p: SavedPlace) => {
    setSelectedId((cur) => (cur === p.id ? null : p.id));
  };

  // ───────────────── “장소 선택하기” → 검색 페이지 ─────────────────
  const openSearch = () => {
    const segments = location.pathname.split("/");
    const mode = segments[1]; // 'details' 또는 'create'

    const path = promiseId
      ? `/${mode}/${promiseId}/participants/new/origin/search`
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

    const segments = location.pathname.split("/");
    const mode = segments[1]; // 'details' 또는 'create'

    const path = promiseId
      ? `/${mode}/${promiseId}/participants/new`
      : `/participants/new`;

    navigate(path, {
      state: {
        ...state,
        nameDraft,
        selectedOrigin: selectedPlace.address, // 도로명주소만 전달
        selectedTransportation: transportation,
      },
    });
  };

  return (
    <div className="min-h-screen flex flex-col">
      <div className="px-4 py-3">
        {/* 저장된 장소 헤더 */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-slate-900">
            저장된 장소
          </span>

          <button
            onClick={openAll}
            className="text-indigo-500 text-xs font-medium px-2 py-1 rounded-full hover:bg-indigo-100"
          >
            전체보기
          </button>
        </div>

        {/* 리스트 */}
        <ul className="space-y-2">
          {saved.map((p) => {
            const active = selectedId === p.id;
            return (
              <li
                key={p.id}
                onClick={() => toggleSelect(p)}
                className={`flex items-center gap-3 p-3.5 rounded-2xl border shadow-sm cursor-pointer 
                active:scale-[0.99] transition
                ${
                  active
                    ? "bg-indigo-50 border-indigo-200"
                    : "bg-white border-slate-100"
                }
              `}
              >
                <div
                  className={`w-9 h-9 grid place-items-center rounded-full
                  ${
                    active
                      ? "bg-indigo-100 text-indigo-600"
                      : "bg-indigo-50 text-indigo-500"
                  }
                `}
                >
                  <MapPin size={20} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="text-[15px] font-semibold text-slate-900 truncate">
                    {p.name}
                  </div>
                  <div className="text-[12px] text-slate-500 truncate">
                    {p.address}
                  </div>
                </div>

                <div className="text-slate-400">
                  {active ? (
                    <CheckCircle2 size={20} className="text-indigo-600" />
                  ) : (
                    <ChevronRight size={18} />
                  )}
                </div>
              </li>
            );
          })}

          {/* {!saved.length && (
            <li className="p-3.5 rounded-xl bg-white border text-sm text-slate-500">
              저장된 장소가 없어요.
            </li>
          )} */}
        </ul>

        <div className="h-4" />

        {/* 장소 선택 카드 */}
        <button
          onClick={openSearch}
          className="w-full flex items-start gap-2 px-4 py-3.5 rounded-2xl shadow-md bg-white active:scale-[0.99] transition mb-6"
        >
          {/* 아이콘 */}
          <div className="w-9 h-9 flex items-center justify-center rounded-full bg-indigo-50 text-indigo-500 mt-0.5">
            <MapPin size={24} />
          </div>

          {/* 텍스트 묶음: 왼쪽 정렬 */}
          <div className="flex flex-col flex-1 text-left">
            <div className="text-[15px] font-semibold text-gray-900">
              장소 선택하기
            </div>
            <div className="text-[12px] text-gray-500">
              저장된 장소 또는 검색으로 선택
            </div>
          </div>

          {/* 오른쪽 화살표 */}
          <ChevronRight size={18} className="text-slate-400" />
        </button>

        {/* 이동수단 선택 */}
        <div className="mt-4">
          <div className="text-sm font-semibold text-gray-800 mb-2 px-1">
            이동수단
          </div>

          <div className="flex items-center bg-white rounded-xl p-1 shadow-sm border border-gray-200 w-full">
            {["대중교통", "자동차", "도보"].map((t) => {
              const active = transportation === t;
              return (
                <button
                  key={t}
                  onClick={() => setTransportation(t)}
                  className={[
                    "flex-1 py-2 rounded-lg text-sm font-medium transition",
                    active
                      ? "bg-blue-400 text-white shadow-sm"
                      : "text-gray-500 hover:bg-gray-100",
                  ].join(" ")}
                >
                  {t}
                </button>
              );
            })}
          </div>
        </div>

        {/* 취소 / 확인 버튼 */}
        <div className="mt-6 grid grid-cols-2 gap-3 px-1 pb-10">
          <Button variant="ghost" size="md" onClick={onBack}>
            취소
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={onConfirm}
            disabled={!selectedPlace}
          >
            확인
          </Button>
        </div>
      </div>
    </div>
  );
}
