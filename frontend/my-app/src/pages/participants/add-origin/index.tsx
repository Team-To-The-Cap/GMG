// src/pages/participants/add-origin/index.tsx
import { useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { MapPin, ChevronRight, CheckCircle2 } from "lucide-react";
import Button from "@/components/ui/button";

import {
  loadSavedPlacesForParticipant,
  saveSavedPlacesForParticipant,
  type SavedPlace,
} from "@/lib/user-storage";
import type { ParticipantLocationState } from "@/types/participant";

export default function AddParticipantOriginPage() {
  const navigate = useNavigate();
  const { promiseId } = useParams();
  const location = useLocation();

  const state = (location.state || {}) as ParticipantLocationState & {
    draftId?: string;
    participantKey?: string;
  };
  const nameDraft = state.nameDraft ?? "";

  // 🔹 참가자 구분용 key
  //   우선순위:
  //   1) state.participantKey (검색 페이지 등에서 이미 계산된 값)
  //   2) 기존 참가자 수정: state.editParticipantId
  //   3) 신규 참가자: state.draftId (AddParticipantStartPage에서 생성)
  //   4) 정말 아무것도 없으면 이 페이지에서 임시 draftId 생성
  const participantKey = useMemo(() => {
    const baseMeetingId = promiseId ?? "no-meeting";

    // 1) 이미 participantKey가 있다면 그대로 사용
    if (state.participantKey) {
      return state.participantKey;
    }

    // 2) 기존 참가자 수정 모드
    if (state.editParticipantId != null) {
      return `${baseMeetingId}:id-${state.editParticipantId}`;
    }

    // 3) 새 참가자 플로우에서 AddParticipantStartPage가 준 draftId 사용
    if (state.draftId) {
      return `${baseMeetingId}:${state.draftId}`;
    }

    // 4) 예외적으로 아무 정보도 없을 때만 임시 키 생성
    const random =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? (crypto as any).randomUUID()
        : `${Date.now().toString(36)}-${Math.random()
            .toString(36)
            .slice(2, 8)}`;
    return `${baseMeetingId}:draft-${random}`;
  }, [promiseId, state.participantKey, state.editParticipantId, state.draftId]);

  // ───────────────── 저장된 장소 목록 (참가자별) ─────────────────
  const baseSaved = useMemo<SavedPlace[]>(() => {
    // 이전 화면에서 state.savedPlaces를 넘겨줬다면 그걸 우선 사용
    if (state.savedPlaces && state.savedPlaces.length) {
      return state.savedPlaces;
    }
    // 없으면 localStorage 참가자별 저장 목록 사용
    return loadSavedPlacesForParticipant(participantKey);
  }, [state.savedPlaces, participantKey]);

  // 🔹 selectedOrigin: string | SavedPlace | null → SavedPlace | null 로 정규화
  //    - string 이면 baseSaved 안에서 먼저 같은 장소를 찾고
  //    - 없을 때만 새 SavedPlace 를 만들어서 사용
  const normalizedSelected = useMemo<SavedPlace | null>(() => {
    const raw = state.selectedOrigin;
    if (!raw) return null;

    // 문자열로 넘어온 경우 (서버에서 온 start_address)
    if (typeof raw === "string") {
      const norm = raw.trim();

      const found = baseSaved.find((p) => {
        const name = (p.name ?? "").trim();
        const addr = (p.address ?? "").trim();
        return (
          name === norm ||
          addr === norm ||
          name.includes(norm) ||
          norm.includes(name) ||
          addr.includes(norm) ||
          norm.includes(addr)
        );
      });

      if (found) return found;

      // 완전히 새로운 장소면 임시 SavedPlace 객체 생성
      return {
        id: norm,
        name: norm,
        address: norm,
      };
    }

    // 이미 SavedPlace 로 넘어온 경우
    return raw;
  }, [state.selectedOrigin, baseSaved]);

  // ───────────────── 화면에 보여줄 saved 리스트 ─────────────────
  const saved = useMemo<SavedPlace[]>(() => {
    if (!normalizedSelected) return baseSaved;

    // id 가 다르더라도 같은 주소면 같은 장소로 본다
    const exists = baseSaved.some(
      (p) =>
        p.id === normalizedSelected.id ||
        (p.address &&
          normalizedSelected.address &&
          p.address.trim() === normalizedSelected.address.trim())
    );

    if (exists) return baseSaved;

    // 정말 새 장소일 때만 맨 위에 추가
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

  // ───────────────── “새로운 장소 검색하기” → 검색 페이지 ─────────────────
  const openSearch = () => {
    const segments = location.pathname.split("/");
    const mode = segments[1]; // 'details' 또는 'create'

    const path = promiseId
      ? `/${mode}/${promiseId}/participants/new/origin/search`
      : `/participants/new/origin/search`;

    navigate(path, {
      // 🔹 replace: true 빼야 뒤로가기 시 /origin 으로 돌아감
      state: {
        ...state,
        savedPlaces: saved, // 최신 목록 넘기기
        selectedOrigin: selectedPlace ?? normalizedSelected ?? null,
        participantKey, // 검색 페이지에서도 같은 key 사용
        draftId: state.draftId, // 혹시 모를 경우를 위해 유지
      },
    });
  };

  const openAll = () => {
    alert("전체보기로 이동 (라우트 연결 예정)");
  };

  // ───────────────── 확인 버튼: 이전 페이지로 선택 결과 반환 ─────────────────
  const onConfirm = () => {
    if (!selectedPlace) return;

    // 🔹 참가자별 저장소에 현재 saved 리스트 저장
    saveSavedPlacesForParticipant(participantKey, saved);

    const segments = location.pathname.split("/");
    const mode = segments[1];

    const path = promiseId
      ? `/${mode}/${promiseId}/participants/new`
      : `/participants/new`;

    navigate(path, {
      state: {
        ...state,
        nameDraft,
        selectedOrigin: selectedPlace.address, // start 페이지에는 주소 문자열만 넘김
        selectedTransportation: transportation,
        savedPlaces: saved,
        participantKey,
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

        {/* 새로운 장소 검색하기 카드 */}
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

        {/* 저장된 장소 리스트 */}
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

        {/* 이동수단 선택 + 하단 버튼 */}
        <div className="h-4" />

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
