// src/services/promise.service.ts
import type { PromiseDetail } from "@/types/promise";
import * as httpImpl from "./promise.service.http.ts";
import * as mockImpl from "./promise.service.mock.ts";

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

export async function calculateAutoPlan(
  promiseId: string
): Promise<PromiseDetail> {
  return useMock
    ? mockImpl.calculateAutoPlan(promiseId)
    : httpImpl.calculateAutoPlan(promiseId);
}
