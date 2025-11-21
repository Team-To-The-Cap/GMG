import { useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { MapPin, ChevronRight, CheckCircle2 } from "lucide-react";
import Button from "@/components/ui/button";

import { loadSavedPlaces, type SavedPlace } from "@/lib/user-storage";
import type { ParticipantLocationState } from "@/types/participant";

export default function AddParticipantOriginPage() {
  const navigate = useNavigate();
  const { promiseId } = useParams();
  const location = useLocation();

  const state = (location.state || {}) as ParticipantLocationState;
  const nameDraft = state.nameDraft ?? "";

  // 🔹 selectedOrigin: string | SavedPlace | null → SavedPlace | null 로 정규화
  const normalizedSelected = useMemo<SavedPlace | null>(() => {
    const raw = state.selectedOrigin;
    if (!raw) return null;

    if (typeof raw === "string") {
      return {
        id: raw,
        name: raw,
        address: raw,
      };
    }

    // 이미 SavedPlace인 경우
    return raw;
  }, [state.selectedOrigin]);

  // ───────────────── 저장된 장소 목록 ─────────────────
  const baseSaved = useMemo<SavedPlace[]>(() => {
    if (state.savedPlaces && state.savedPlaces.length) {
      return state.savedPlaces;
    }
    return loadSavedPlaces();
  }, [state.savedPlaces]);

  // 🔹 실제로 화면에 쓸 saved 리스트
  //    - normalizedSelected 가 baseSaved 안에 없으면 맨 위에 추가
  const saved = useMemo<SavedPlace[]>(() => {
    if (!normalizedSelected) return baseSaved;

    const exists = baseSaved.some((p) => p.id === normalizedSelected.id);
    if (exists) return baseSaved;

    return [normalizedSelected, ...baseSaved];
  }, [baseSaved, normalizedSelected]);

  // 🔹 선택 상태
  const [selectedId, setSelectedId] = useState<string | null>(
    normalizedSelected?.id ?? null
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
        selectedOrigin: selectedPlace ?? normalizedSelected ?? null,
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
        selectedOrigin: selectedPlace.address, // 도로명 주소만 전달
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
        </ul>

        <div className="h-4" />

        {/* 장소 선택 카드 */}
        <button
          onClick={openSearch}
          className="w-full flex items-start gap-2 px-4 py-3.5 rounded-2xl shadow-md bg-white active:scale-[0.99] transition mb-6"
        >
          <div className="w-9 h-9 flex items-center justify-center rounded-full bg-indigo-50 text-indigo-500 mt-0.5">
            <MapPin size={24} />
          </div>

          <div className="flex flex-col flex-1 text-left">
            <div className="text-[15px] font-semibold text-gray-900">
              새로운 장소 검색하기
            </div>
            <div className="text-[12px] text-gray-500">
              지정된 장소 또는 검색으로 선택
            </div>
          </div>

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
