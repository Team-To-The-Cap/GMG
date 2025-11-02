// src/services/promise.service.ts
import type { PromiseDetail } from "@/types/promise";
import * as httpImpl from "./promise.service.http.ts";
import * as mockImpl from "./promise.service.mock.ts";

export async function getPromiseDetail(
  promiseId: string
): Promise<PromiseDetail> {
  const useMock = import.meta.env.VITE_TEST_MODE === "true";  
  return useMock
    ? mockImpl.getPromiseDetail(promiseId)
    : httpImpl.getPromiseDetail(promiseId);
}

export async function getPromiseList(): Promise<PromiseDetail[]> {
  const useMock = import.meta.env.VITE_TEST_MODE === "true";
  return useMock ? mockImpl.getPromiseList() : httpImpl.getPromiseList();
}