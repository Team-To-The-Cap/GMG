// src/pages/participants/add-start/index.tsx
import { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import Button from "@/components/ui/button";
import styles from "./style.module.css";
import { CalendarIcon, PinIcon, HeartIcon } from "@/assets/icons/icons";
import type { PlaceCategory } from "@/lib/user-storage";
import {
  type StoredParticipantPlace as SavedPlace,
  PARTICIPANT_PLACES_PREFIX,
  PARTICIPANT_PLACES_DRAFT_ID_KEY,
} from "@/utils/participant-place-storage";

function createDraftId() {
  // crypto.randomUUID 지원 안 되는 옛 브라우저 대비 fallback
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `draft-${crypto.randomUUID()}`;
  }
  return `draft-${Math.random().toString(36).slice(2)}`;
}

export default function AddParticipantStartPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { promiseId } = useParams(); // 예: "116"

  const [name, setName] = useState("");
  /**
   * origin: 실제 서버로 보내는 주소 문자열
   * originPlace: SavedPlace 전체 객체 (이름/주소 모두 포함, UI + 로컬 저장용)
   */
  const [origin, setOrigin] = useState<string | null>(null);
  const [originPlace, setOriginPlace] = useState<SavedPlace | null>(null);

  const [availableTimes, setAvailableTimes] = useState<
    { start_time: string; end_time: string }[]
  >([]);
  const [transportation, setTransportation] = useState<string | null>(null);
  const [preferredCats, setPreferredCats] = useState<PlaceCategory[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // 🔹 최소 한 가지(일정/출발장소/선호) 입력 여부
  const hasAnyDetail = useMemo(() => {
    return (
      availableTimes.length > 0 || // 일정
      !!origin || // 출발장소
      preferredCats.length > 0 // 선호
    );
  }, [availableTimes.length, origin, preferredCats.length]);

  // ✅ 수정 모드인지 구분하기 위한 id (null이면 신규 생성)
  const [editParticipantId, setEditParticipantId] = useState<
    string | number | null
  >(null);

  // ✅ 이 참가자 전용 draft-id (신규 참가자일 때만 사용)
  const [participantDraftId, setParticipantDraftId] = useState<string | null>(
    null
  );

  useEffect(() => {
    const state = location.state as any;

    if (state?.nameDraft !== undefined) {
      setName(state.nameDraft);
    }

    const rawEditId =
      state?.editParticipantId !== undefined ? state.editParticipantId : null;
    const rawDraftId = state?.participantDraftId ?? null;

    // ───────────────── selectedOrigin 복구 ─────────────────
    if (state?.selectedOrigin) {
      if (typeof state.selectedOrigin === "string") {
        // 서버에서 온 start_address: 대부분 "주소" 문자열
        const addr = state.selectedOrigin as string;
        setOrigin(addr);
        setOriginPlace(null);

        // 👉 이 약속(promiseId)에 대해 저장된 모든 장소 캐시에서
        //    동일한 주소/이름을 가진 SavedPlace를 찾아서 이름을 복구한다.
        if (promiseId && typeof window !== "undefined") {
          const norm = addr.trim();
          const prefix = `${PARTICIPANT_PLACES_PREFIX}${promiseId}:`;

          let matched: SavedPlace | undefined;

          for (let i = 0; i < window.localStorage.length; i++) {
            const key = window.localStorage.key(i);
            if (!key || !key.startsWith(prefix)) continue;

            try {
              const raw = window.localStorage.getItem(key);
              if (!raw) continue;
              const arr = JSON.parse(raw) as SavedPlace[];
              if (!Array.isArray(arr)) continue;

              for (const p of arr) {
                const name = (p.name ?? "").trim();
                const address = (p.address ?? "").trim();
                if (
                  address === norm ||
                  name === norm ||
                  address.includes(norm) ||
                  norm.includes(address)
                ) {
                  matched = p;
                  break;
                }
              }
              if (matched) break;
            } catch {
              // 파싱 실패는 무시
            }
          }

          if (matched) {
            setOriginPlace(matched);
            // origin(주소)은 그대로 addr 사용 (백엔드 전송용)
          }
        }
      } else {
        // SavedPlace 객체로 넘어온 경우 (새로 선택하고 돌아왔을 때)
        const p = state.selectedOrigin as SavedPlace;
        setOrigin(p.address || p.name || "");
        setOriginPlace(p);
      }
    }

    if (state?.selectedTransportation) {
      setTransportation(state.selectedTransportation);
    }
    if (state?.selectedTimes) {
      setAvailableTimes(state.selectedTimes);
    }
    if (state?.selectedPreferences) {
      setPreferredCats(state.selectedPreferences as PlaceCategory[]);
    }

    // ───────────────── edit / draft id 설정 ─────────────────
    if (rawEditId !== null && rawEditId !== undefined) {
      // 🔹 수정 모드: 서버 participant id 사용
      setEditParticipantId(rawEditId);
      // 수정 모드에서는 draft-id 필요 없음
      setParticipantDraftId(null);
    } else {
      // 🔹 신규 참가자: 기존 state에 draft-id가 있으면 재사용, 없으면 새로 생성
      if (rawDraftId) {
        setParticipantDraftId(rawDraftId);
      } else {
        const newDraftId = createDraftId();
        setParticipantDraftId(newDraftId);
      }
    }
  }, [location.state, promiseId]);

  const openSchedulePicker = () => {
    if (!promiseId) return;

    const segments = location.pathname.split("/");
    const mode = segments[1]; // 'details' 또는 'create'

    navigate(`/${mode}/${promiseId}/promise-time`, {
      state: {
        nameDraft: name,
        selectedOrigin: origin, // 일정 화면은 문자열만 필요
        selectedTransportation: transportation,
        selectedPreferences: preferredCats,
        selectedTimes: availableTimes,
        editParticipantId,
        participantDraftId,
      },
    });
  };

  const openOriginPicker = () => {
    const segments = location.pathname.split("/");
    const mode = segments[1]; // 'details' 또는 'create'

    const path = promiseId
      ? `/${mode}/${promiseId}/participants/new/origin`
      : `/participants/new/origin`;

    navigate(path, {
      state: {
        nameDraft: name,
        // SavedPlace가 있으면 객체, 아니면 문자열
        selectedOrigin: originPlace ?? origin,
        selectedTimes: availableTimes,
        selectedTransportation: transportation,
        selectedPreferences: preferredCats,
        editParticipantId,
        participantDraftId,
      },
    });
  };

  const openPreferencePicker = () => {
    if (!promiseId) return;

    const segments = location.pathname.split("/");
    const mode = segments[1]; // 'details' 또는 'create'
    navigate(`/${mode}/${promiseId}/participants/new/preferences`, {
      state: {
        nameDraft: name,
        selectedOrigin: origin, // 표시용
        selectedTimes: availableTimes,
        selectedTransportation: transportation,
        selectedPreferences: preferredCats,
        editParticipantId,
        participantDraftId,
      },
    });
  };

  const submit = async () => {
    if (!promiseId) return alert("약속 ID가 없습니다.");
    if (!name.trim()) return alert("이름을 입력하세요.");
    if (!hasAnyDetail) {
      return alert("일정, 출발장소, 선호 중 하나 이상은 입력해주세요.");
    }
    if (submitting) return;

    const payload: any = {
      name,
      member_id: 0,
      // ✅ SavedPlace.address 우선 사용, 없으면 origin 문자열
      start_address: originPlace?.address ?? origin ?? null,
      transportation: transportation ?? null,
      fav_activity: preferredCats.length > 0 ? preferredCats.join(",") : null,
      available_times: availableTimes,
    };

    const numericMeetingId = promiseId.replace(/\D/g, "");

    try {
      setSubmitting(true);

      let res: Response;

      if (editParticipantId !== null && editParticipantId !== undefined) {
        // 🔹 수정 모드 → PATCH /meetings/{meeting_id}/participants/{participant_id}
        const numericParticipantId = String(editParticipantId).replace(
          /\D/g,
          ""
        );

        res = await fetch(
          `http://223.130.152.114:8001/meetings/${numericMeetingId}/participants/${numericParticipantId}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              accept: "application/json",
            },
            body: JSON.stringify(payload),
          }
        );

        if (!res.ok) {
          const err = await res.text();
          throw new Error(err || "저장 실패");
        }
      } else {
        // 🔹 신규 생성 모드 → POST /meetings/{meeting_id}/participants/
        res = await fetch(
          `http://223.130.152.114:8001/meetings/${numericMeetingId}/participants/`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              accept: "application/json",
            },
            body: JSON.stringify(payload),
          }
        );

        if (!res.ok) {
          const err = await res.text();
          throw new Error(err || "저장 실패");
        }

        // ✅ 서버가 돌려준 참가자 id 읽기 (필드명 방어적으로 처리)
        const created = await res.json();
        const createdId =
          created?.id ??
          created?.participant_id ??
          created?.participantId ??
          null;

        // ✅ draft-<participantDraftId> → id-<createdId> 로 캐시 키 마이그레이션
        if (
          createdId != null &&
          typeof window !== "undefined" &&
          participantDraftId
        ) {
          const globalDraftId = window.localStorage.getItem(
            PARTICIPANT_PLACES_DRAFT_ID_KEY
          );

          if (globalDraftId) {
            // 예: gmg.participant.places.v1:116:<globalDraftId>:
            const basePrefix = `${PARTICIPANT_PLACES_PREFIX}${promiseId}:${globalDraftId}:`;

            const oldKey = `${basePrefix}${participantDraftId}`; // draft-... 키
            const newKey = `${basePrefix}id-${createdId}`; // 최종 참가자 키

            const raw = window.localStorage.getItem(oldKey);
            if (raw) {
              // 이미 newKey가 있으면 덮어쓸지 말지는 선택인데,
              // 여기서는 가장 최근 draft 값을 그대로 복사
              window.localStorage.setItem(newKey, raw);
            }
            // 옛 draft 키는 삭제
            window.localStorage.removeItem(oldKey);
          }
        }
      }

      const segments = location.pathname.split("/");
      const mode = segments[1];
      const id = segments[2];

      navigate(`/${mode}/${id}`, { replace: true });
    } catch (error) {
      console.error(error);
      alert("참석자 저장 중 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.container}>
      <label className={styles.label} htmlFor="name">
        이름 *
      </label>
      <input
        id="name"
        className={styles.input}
        placeholder="이름을 입력하세요"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      {/* 일정 입력하기 */}
      <button
        className={`${styles.rowBtn} ${
          availableTimes.length > 0 ? styles.active : ""
        }`}
        onClick={openSchedulePicker}
      >
        <span className={styles.icon}>
          <CalendarIcon />
        </span>
        <span className={styles.rowText}>
          일정 입력하기{availableTimes.length > 0 ? " ✓" : ""}
        </span>
      </button>

      {/* 출발장소 입력하기 */}
      <button
        className={`${styles.rowBtn} ${origin ? styles.active : ""}`}
        onClick={openOriginPicker}
      >
        <span className={styles.icon}>
          <PinIcon />
        </span>
        <span className={styles.rowText}>
          출발장소 입력하기
          {originPlace
            ? ` · ${originPlace.name}` // 이름이 있으면 이름으로 표시
            : origin
            ? ` · ${origin}` // 그 외에는 origin 문자열(주소) 표시
            : ""}
        </span>
      </button>

      {/* 선호 입력하기 */}
      <button className={styles.rowBtn} onClick={openPreferencePicker}>
        <span className={`${styles.icon} ${styles.heartIcon}`}>
          <HeartIcon />
        </span>
        <span className={styles.rowText}>
          선호 입력하기
          {preferredCats.length > 0 ? ` · ${preferredCats.join(", ")}` : ""}
        </span>
      </button>

      <div className={styles.footer}>
        <Button
          variant="primary"
          size="lg"
          className={styles.saveBtn}
          disabled={!name.trim() || submitting || !hasAnyDetail}
          onClick={submit}
        >
          {submitting ? "저장 중..." : "저장하기"}
        </Button>
      </div>
    </div>
  );
}
