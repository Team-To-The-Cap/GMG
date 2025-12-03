// src/services/promise.service.ts
import type { PromiseDetail } from "@/types/promise";
import * as httpImpl from "./promise.service.http.ts";
import * as mockImpl from "./promise.service.mock.ts";
import type { MeetingPlace } from "@/types/meeting.ts";

const useMock = import.meta.env.VITE_TEST_MODE === "true";

export async function getPromiseDetail(
  promiseId: string
): Promise<PromiseDetail> {
  return useMock
    ? mockImpl.getPromiseDetail(promiseId)
    : httpImpl.getPromiseDetail(promiseId);
}

export async function getPromiseList(): Promise<PromiseDetail[]> {
  return useMock ? mockImpl.getPromiseList() : httpImpl.getPromiseList();
}

export async function savePromiseDetail(
  detail: PromiseDetail
): Promise<PromiseDetail> {
  return useMock
    ? mockImpl.savePromiseDetail(detail)
    : httpImpl.savePromiseDetail(detail);
}

/** ✅ 새 빈 약속 생성 후, 생성된 PromiseDetail 반환 */
export async function createEmptyPromise(): Promise<PromiseDetail> {
  return useMock
    ? mockImpl.createEmptyPromise()
    : httpImpl.createEmptyPromise();
}

/** 🔹 약속 삭제 */
export async function deletePromise(promiseId: string): Promise<void> {
  return useMock
    ? mockImpl.deletePromise(promiseId)
    : httpImpl.deletePromise(promiseId);
}

/** 🔹 참여자 삭제 */
export async function deleteParticipant(
  promiseId: string,
  participantId: string
): Promise<void> {
  return useMock
    ? mockImpl.deleteParticipant(promiseId, participantId)
    : httpImpl.deleteParticipant(promiseId, participantId);
}

/** 🔹 자동 일정/장소 계산 */
export async function calculateAutoPlan(
  promiseId: string
): Promise<PromiseDetail> {
  return useMock
    ? mockImpl.calculateAutoPlan(promiseId)
    : httpImpl.calculateAutoPlan(promiseId);
}

/** 🔹 자동 코스 계산 */
export async function calculateAutoCourse(
  promiseId: string
): Promise<PromiseDetail> {
  return useMock
    ? mockImpl.calculateAutoCourse(promiseId)
    : httpImpl.calculateAutoCourse(promiseId);
}

export async function updateMeetingName(
  promiseId: string,
  name: string
): Promise<void> {
  return useMock
    ? mockImpl.updateMeetingName(promiseId, name)
    : httpImpl.updateMeetingName(promiseId, name);
}

/** 🔹 약속 전체 초기화 (서버/모킹 공통 인터페이스) */
export async function resetPromiseOnServer(
  detail: PromiseDetail
): Promise<PromiseDetail> {
  return useMock
    ? mockImpl.resetPromiseOnServer(detail)
    : httpImpl.resetPromiseOnServer(detail);
}

/** 🔹 반드시 가고 싶은 장소 추가 */
export async function addMustVisitPlace(
  promiseId: string,
  payload: { name: string; address?: string }
): Promise<void> {
  return useMock
    ? mockImpl.addMustVisitPlace(promiseId, payload)
    : httpImpl.addMustVisitPlace(promiseId, payload);
}

/** 🔹 반드시 가고 싶은 장소 삭제 */
export async function deleteMustVisitPlace(
  promiseId: string,
  placeId: string
): Promise<void> {
  return useMock
    ? mockImpl.deleteMustVisitPlace(promiseId, placeId)
    : httpImpl.deleteMustVisitPlace(promiseId, placeId);
}

/** 🔹 약속에 연결된 장소(코스 장소) 목록 조회 */
export async function getMeetingPlaces(
  promiseId: string
): Promise<MeetingPlace[]> {
  return useMock
    ? mockImpl.getMeetingPlaces(promiseId)
    : httpImpl.getMeetingPlaces(promiseId);
}

/** 🔹 선택한 장소를 MeetingPlan의 확정 장소로 반영 */
export async function setMeetingFinalPlace(
  promiseId: string,
  payload: { address: string; lat: number; lng: number }
): Promise<void> {
  return useMock
    ? mockImpl.setMeetingFinalPlace(promiseId, payload)
    : httpImpl.setMeetingFinalPlace(promiseId, payload);
}
