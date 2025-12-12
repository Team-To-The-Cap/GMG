// src/pages/participants/place-calculation/index.tsx
import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { MapPin, ChevronLeft, ChevronRight, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { PanInfo } from "framer-motion";

import {
  getMeetingPlaces,
  setMeetingFinalPlace,
  getPromiseDetail,
} from "@/services/promise/promise.service";
import { http } from "@/lib/http";
import type { Participant } from "@/types/participant";

declare global {
  interface Window {
    naver: any;
  }
}

interface PlaceCandidate {
  id: string;

  // 첫 줄 큰 제목: POI 이름 (이태원역 6호선 등). 없으면 name 사용
  title: string;

  // 주소 한 줄
  address: string;

  // (필요하면 UI 라벨로 쓸) "자동 추천 만남 장소", "자동 추천 후보 #2"
  label: string;

  lat: number;
  lng: number;
  averageDistance: string;
  description: string;
}

export function PlaceCalculationScreen() {
  const cardVariants = {
    enter: (direction: number) => ({
      opacity: 0,
      scale: 0.9,
      // 초기 진입(direction === 0)은 그냥 가운데에서 뜨게
      x: direction === 0 ? 0 : direction > 0 ? 300 : -300,
    }),
    center: {
      opacity: 1,
      scale: 1,
      x: 0,
    },
    exit: (direction: number) => ({
      opacity: 0,
      scale: 0.9,
      // 다음(→)이면 왼쪽으로(-300), 이전(←)이면 오른쪽으로(300)
      x: direction === 0 ? 0 : direction > 0 ? -300 : 300,
    }),
  };

  const { promiseId } = useParams<{ promiseId: string }>();
  const navigate = useNavigate();

  const [places, setPlaces] = useState<PlaceCandidate[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<PlaceCandidate | null>(
    null
  );
  const [currentSlide, setCurrentSlide] = useState(0);

  // 🔥 애니메이션 방향은 ref로 관리 (unmount 되는 카드도 같은 값 사용하도록)
  const directionRef = useRef<number>(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const mapRef = useRef<HTMLDivElement | null>(null);
  const naverMapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const participantMarkersRef = useRef<any[]>([]);
  const polylinesRef = useRef<any[]>([]);
  const labelMarkersRef = useRef<any[]>([]);

  const [participants, setParticipants] = useState<Participant[]>([]);

  const currentPlace = places[currentSlide];

  function mapMeetingPlaceToCandidate(p: any): PlaceCandidate {
    const isAutoMeetingPoint = p.category === "meeting_point";

    const safeAddress =
      p.address && p.address.trim().length > 0
        ? p.address
        : "정확한 주소는 지도에서 확인해 주세요";

    // 🔹 POI 이름이 있으면 그것을 제목으로, 없으면 name 사용
    const title: string = p.poi_name || p.name;

    // 🔹 카드 아래에 깔리는 설명은 기존 로직 활용
    let description: string;
    if (isAutoMeetingPoint) {
      if (p.name === "자동 추천 만남 장소") {
        description =
          "모든 참여자의 출발지를 기준으로 이동 시간이 가장 균형 잡히도록 계산한 대표 만남 장소예요.";
      } else {
        description =
          "대표 만남 장소와 비슷한 거리·위치에 있는 대안 후보 장소예요.";
      }
    } else if (p.category && p.duration) {
      description = `${p.category} · 예상 체류 시간 ${p.duration}분`;
    } else if (p.category) {
      description = p.category;
    } else {
      description = "추천 위치";
    }

    const averageDistance = isAutoMeetingPoint
      ? "참여자들의 이동 거리를 모두 고려해 계산한 추천 위치예요."
      : "대표 위치 주변의 다른 후보 위치예요.";

    return {
      id: String(p.id),
      title, // 네이버식 제목
      address: safeAddress, // 주소 한 줄
      label: p.name, // 자동 추천 만남 장소 / 자동 추천 후보 #2
      lat: p.latitude,
      lng: p.longitude,
      averageDistance,
      description,
    };
  }

  // 0) 서버에서 장소 목록 가져오기 (plan에서 가져오거나 places에서 가져오기)
  useEffect(() => {
    if (!promiseId) return;

    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError(null);

        // 먼저 PromiseDetail을 가져와서 plan 정보 확인
        const detail = await getPromiseDetail(promiseId);
        if (cancelled) return;

        // 참가자 정보 저장
        setParticipants(detail.participants || []);

        let mapped: PlaceCandidate[] = [];

        // 1. places 배열에서 meeting_point 카테고리 찾기
        const meetingPlaces = await getMeetingPlaces(promiseId);
        console.log("[PlaceCalculation] API places 응답:", meetingPlaces);
        
        const meetingPointPlaces = (meetingPlaces ?? []).filter(
          (p: any) => p.category === "meeting_point"
        );

        if (meetingPointPlaces.length > 0) {
          // places에 meeting_point가 있으면 사용
          mapped = meetingPointPlaces.map((p) => mapMeetingPlaceToCandidate(p));
        } else if (detail.place) {
          // places에 없으면 plan에서 가져온 place 정보 사용
          mapped = [
            {
              id: "plan-place",
              title: detail.place.name || detail.place.address || "만남 장소",
              address: detail.place.address || "",
              label: "자동 추천 만남 장소",
              lat: detail.place.lat || 0,
              lng: detail.place.lng || 0,
              averageDistance:
                "참여자들의 이동 거리를 모두 고려해 계산한 추천 위치예요.",
              description:
                "모든 참여자의 출발지를 기준으로 이동 시간이 가장 균형 잡히도록 계산한 대표 만남 장소예요.",
            },
          ];
        }

        console.log("[PlaceCalculation] 최종 매핑된 places:", mapped);

        setPlaces(mapped);
        setCurrentSlide(0);
        directionRef.current = 0; // 초기엔 방향 없음
        setSelectedPlace(null);
      } catch (e) {
        console.error("[PlaceCalculation] failed to load meeting places", e);
        if (!cancelled) {
          setError("만남 장소 후보를 불러오지 못했습니다.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [promiseId]);

  const handleNext = () => {
    if (currentSlide < places.length - 1) {
      directionRef.current = 1; // 👉 다음 카드로
      setCurrentSlide((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentSlide > 0) {
      directionRef.current = -1; // 👈 이전 카드로
      setCurrentSlide((prev) => prev - 1);
    }
  };

  const handleDragEnd = (
    _event: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo
  ) => {
    if (!places.length) return;

    const swipeThreshold = 50;

    if (info.offset.x > swipeThreshold && currentSlide > 0) {
      // 오른쪽으로 스와이프 → 이전 카드
      directionRef.current = -1;
      setCurrentSlide((prev) => prev - 1);
    } else if (
      info.offset.x < -swipeThreshold &&
      currentSlide < places.length - 1
    ) {
      // 왼쪽으로 스와이프 → 다음 카드
      directionRef.current = 1;
      setCurrentSlide((prev) => prev + 1);
    }
  };

  const handleConfirm = async () => {
    if (!selectedPlace || !promiseId) return;

    try {
      // 선택한 장소를 MeetingPlan의 확정 장소로 반영
      await setMeetingFinalPlace(promiseId, {
        address: selectedPlace.address,
        lat: selectedPlace.lat,
        lng: selectedPlace.lng,
      });

      console.log("선택된 장소:", selectedPlace);
      // 실제 약속 상세 페이지로 이동
      navigate(`/details/${promiseId}`);
    } catch (e) {
      console.error("[PlaceCalculation] set final place failed", e);
      alert("선택한 장소를 저장하는 중 오류가 발생했습니다.");
    }
  };

  // 1) 네이버 지도 초기화 / 마커 설정 (places 준비된 후)
  useEffect(() => {
    if (!mapRef.current || places.length === 0) return;

    // 네이버 지도 API 로드 확인
    if (!window.naver || !window.naver.maps) {
      console.error("[Naver Map] Naver Maps API is not loaded");
      setError("네이버 지도를 불러올 수 없습니다. 인터넷 연결을 확인해주세요.");
      return;
    }

    // 지도 최초 생성
    if (!naverMapRef.current) {
      try {
        const firstPlace = places[0];
        const center = new window.naver.maps.LatLng(
          firstPlace.lat,
          firstPlace.lng
        );

        const map = new window.naver.maps.Map(mapRef.current, {
          center,
          zoom: 14,
        });
        naverMapRef.current = map;

        requestAnimationFrame(() => {
          window.naver.maps.Event.trigger(map, "resize");
          map.setCenter(center);
        });
      } catch (err) {
        console.error("[Naver Map] Failed to initialize map:", err);
        setError("지도를 초기화하는 중 오류가 발생했습니다.");
      }
    }

    const map = naverMapRef.current;

    // 기존 마커 제거
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    // 후보지 마커 표시
    markersRef.current = places.map((p) => {
      return new window.naver.maps.Marker({
        position: new window.naver.maps.LatLng(p.lat, p.lng),
        map,
      });
    });

    return () => {
      markersRef.current.forEach((m) => m.setMap(null));
      markersRef.current = [];
    };
  }, [places]);

  // 2) 슬라이드 변경 시 해당 장소로 이동
  useEffect(() => {
    if (!window.naver || !naverMapRef.current || !places[currentSlide]) return;
    const place = places[currentSlide];
    const center = new window.naver.maps.LatLng(place.lat, place.lng);
    naverMapRef.current.setCenter(center);
  }, [currentSlide, places]);

  // 3) 참가자 위치 마커, 이동 경로, 이동 시간 표시
  useEffect(() => {
    if (
      !window.naver ||
      !naverMapRef.current ||
      !currentPlace ||
      participants.length === 0
    )
      return;

    const map = naverMapRef.current;

    // 기존 참가자 마커, 폴리라인, 라벨 마커 제거
    participantMarkersRef.current.forEach((m) => m.setMap(null));
    participantMarkersRef.current = [];
    polylinesRef.current.forEach((p) => p.setMap(null));
    polylinesRef.current = [];
    labelMarkersRef.current.forEach((m) => m.setMap(null));
    labelMarkersRef.current = [];

    // 참가자 마커 표시 및 이동 시간 계산
    const fetchTravelTimes = async () => {
      const colors = ["#10b981", "#3b82f6", "#8b5cf6", "#f59e0b", "#ef4444"];

      for (let i = 0; i < participants.length; i++) {
        const participant = participants[i];
        const startLat = participant.startLat;
        const startLng = participant.startLng;

        if (!startLat || !startLng) continue;

        const startPos = new window.naver.maps.LatLng(startLat, startLng);
        const color = colors[i % colors.length];

        // 참가자 마커 생성 (번호 표시)
        const participantMarker = new window.naver.maps.Marker({
          position: startPos,
          map,
          icon: {
            content: `<div style="width: 32px; height: 32px; background-color: ${color}; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 14px;">${i + 1}</div>`,
            anchor: new window.naver.maps.Point(16, 16),
          },
          title: participant.name,
          zIndex: 1000,
        });
        participantMarkersRef.current.push(participantMarker);

        // 직선 경로 + 이동 시간 (네이버 Directions API 사용)
        try {
          const transportation = participant.transportation || "driving";
          const mode =
            transportation === "도보" || transportation === "walking"
              ? "walking"
              : transportation === "대중교통" ||
                  transportation === "transit"
                ? "transit"
                : "driving";

          // travel-time으로 시간 받고 직선 표시 (네이버 실패 시 백엔드에서 추정치로 fallback)
          const travelTimeResult = await http.request<{
            duration_seconds: number;
            duration_minutes: number;
            mode: string;
            success: boolean;
          }>(
            `/directions/travel-time?start_lat=${startLat}&start_lng=${startLng}&goal_lat=${currentPlace.lat}&goal_lng=${currentPlace.lng}&mode=${mode}`
          );

          if (travelTimeResult?.success) {
            const endPos = new window.naver.maps.LatLng(
              currentPlace.lat,
              currentPlace.lng
            );
            const polyline = new window.naver.maps.Polyline({
              map,
              path: [startPos, endPos],
              strokeColor: color,
              strokeWeight: 4,
              strokeOpacity: 0.6,
              strokeStyle: "solid",
              zIndex: 500,
            });
            polylinesRef.current.push(polyline);

            const midPos = new window.naver.maps.LatLng(
              (startLat + currentPlace.lat) / 2,
              (startLng + currentPlace.lng) / 2
            );
            const modeText =
              travelTimeResult.mode === "walking"
                ? "도보"
                : travelTimeResult.mode === "transit"
                  ? "대중교통"
                  : "자동차";
            const minutes = Math.round(travelTimeResult.duration_minutes);
            const labelContent = `<div style="background-color: rgba(0,0,0,0.75); color: white; padding: 6px 10px; border-radius: 10px; box-shadow: 0 2px 6px rgba(0,0,0,0.25); font-size: 12px; font-weight: 700; white-space: nowrap;">
              ${modeText} ${minutes}분
            </div>`;
            const labelMarker = new window.naver.maps.Marker({
              position: midPos,
              map,
              icon: { content: labelContent, anchor: new window.naver.maps.Point(0, 0) },
              zIndex: 1001,
            });
            labelMarkersRef.current.push(labelMarker);
          }
        } catch (e) {
          console.error(
            `[PlaceCalculation] Failed to get travel time for ${participant.name}:`,
            e
          );
          
          // API 실패 시에도 기본 경로는 표시
          const endPos = new window.naver.maps.LatLng(
            currentPlace.lat,
            currentPlace.lng
          );
          const polyline = new window.naver.maps.Polyline({
            map,
            path: [startPos, endPos],
            strokeColor: color,
            strokeWeight: 3,
            strokeOpacity: 0.6,
            strokeStyle: "dashed",
            zIndex: 500,
          });
          polylinesRef.current.push(polyline);
        }
      }
    };

    fetchTravelTimes();

    return () => {
      participantMarkersRef.current.forEach((m) => m.setMap(null));
      participantMarkersRef.current = [];
      polylinesRef.current.forEach((p) => p.setMap(null));
      polylinesRef.current = [];
      labelMarkersRef.current.forEach((m) => m.setMap(null));
      labelMarkersRef.current = [];
    };
  }, [currentPlace, participants]);

  // ===== 로딩/에러/빈 데이터 처리 =====

  if (loading) {
    return (
      <div className="flex-1 flex flex-col justify-center items-center bg-background">
        <p className="text-sm text-gray-500">만남 장소를 계산 중입니다...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex flex-col justify-center items-center bg-background">
        <p className="text-sm text-red-500">{error}</p>
      </div>
    );
  }

  if (!places.length) {
    return (
      <div className="flex-1 flex flex-col justify-center items-center bg-background">
        <p className="text-sm text-gray-500">추천할 만남 장소가 없습니다.</p>
      </div>
    );
  }

  // ===== 실제 화면 렌더링 =====

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-background">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4 shrink-0">
        <h1 className="font-bold text-center">만남 장소 산출 결과</h1>
        <p className="text-sm text-gray-600 text-center mt-1">
          모든 참여자를 고려한 최적의 장소입니다
        </p>
      </div>

      {/* 네이버 지도 영역 */}
      <div className="relative h-64 shrink-0">
        <div ref={mapRef} className="w-full h-full" />

        {/* Slide counter */}
        <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-md z-10">
          <span className="text-sm font-medium text-gray-900">
            {currentSlide + 1} / {places.length}
          </span>
        </div>
      </div>

      {/* Card Slider Section */}
      <div className="flex-1 overflow-hidden py-6 relative">
        <div className="relative h-full px-2">
          <div className="flex items-center justify-center h-full">
            <div className="w-full max-w-md relative">
              <AnimatePresence
                mode="wait"
                initial={false}
                custom={directionRef.current}
              >
                <motion.div
                  key={currentSlide}
                  custom={directionRef.current} // ← 방향 전달
                  variants={cardVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.3 }}
                  drag="x"
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={0.2}
                  onDragEnd={handleDragEnd}
                  className="w-full"
                >
                  <div
                    onClick={() => setSelectedPlace(places[currentSlide])}
                    className={`
                      bg-white rounded-2xl shadow-lg p-6 cursor-pointer transition-all duration-300 mx-4
                      ${
                        selectedPlace?.id === places[currentSlide].id
                          ? "ring-4 ring-[#828bbb] shadow-lg"
                          : "hover:shadow-xl"
                      }
                    `}
                  >
                    {/* Badge */}
                    {currentSlide === 0 && (
                      <div className="inline-flex items-center px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-4">
                        ⭐ 추천
                      </div>
                    )}

                    {/* Place name */}
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        {/* 상단 라벨 (자동 추천 만남 장소 / 후보 #2) */}
                        <p className="text-xs font-medium text-gray-500 mb-1">
                          {places[currentSlide].label}
                        </p>
                        {/* 큰 제목: 이태원역 6호선 */}
                        <h3 className="font-bold text-gray-900 pr-4">
                          {places[currentSlide].title}
                        </h3>
                      </div>
                      {selectedPlace?.id === places[currentSlide].id && (
                        <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center shrink-0">
                          <Check className="w-4 h-4 text-white" />
                        </div>
                      )}
                    </div>

                    {/* Address */}
                    <div className="space-y-2 mb-4">
                      <div className="flex items-start">
                        <MapPin className="w-4 h-4 text-gray-400 mr-2 mt-0.5 shrink-0" />
                        <p className="text-sm text-gray-900">
                          {places[currentSlide].address}
                        </p>
                      </div>
                    </div>

                    {/* Description */}
                    <div className="bg-blue-50 rounded-xl p-3">
                      <p className="text-sm text-gray-700">
                        {places[currentSlide].description}
                      </p>
                    </div>

                    {/* Distance info */}
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <p className="text-xs text-gray-600">
                        {places[currentSlide].averageDistance}
                      </p>
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>

              {/* Side cards preview */}
              {currentSlide > 0 && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 opacity-30 pointer-events-none">
                  <div className="bg-white rounded-2xl shadow-md p-4 w-20 h-32 scale-75" />
                </div>
              )}
              {currentSlide < places.length - 1 && (
                <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 opacity-30 pointer-events-none">
                  <div className="bg-white rounded-2xl shadow-md p-4 w-20 h-32 scale-75" />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Navigation arrows */}
        {currentSlide > 0 && (
          <button
            onClick={handlePrev}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50 transition-colors z-10"
          >
            <ChevronLeft className="w-5 h-5 text-gray-700" />
          </button>
        )}
        {currentSlide < places.length - 1 && (
          <button
            onClick={handleNext}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50 transition-colors z-10"
          >
            <ChevronRight className="w-5 h-5 text-gray-700" />
          </button>
        )}

        {/* Swipe indicator */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
          <div className="flex space-x-2">
            {places.map((_, index) => (
              <button
                key={index}
                onClick={() => {
                  if (index === currentSlide) return;
                  directionRef.current = index > currentSlide ? 1 : -1;
                  setCurrentSlide(index);
                }}
                className={`h-2 rounded-full transition-all duration-300 ${
                  index === currentSlide ? "w-6 bg-primary" : "w-2 bg-gray-300"
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Bottom confirmation button */}
      <div className="border-t border-gray-200 bg-white p-4 shrink-0">
        <button
          onClick={handleConfirm}
          disabled={!selectedPlace}
          className={`
            w-full py-4 rounded-3xl font-medium transition-all duration-200 flex items-center justify-center
            ${
              selectedPlace
                ? "bg-primary text-white bg-blue-600 shadow-md"
                : "bg-gray-400 text-white cursor-not-allowed"
            }
          `}
        >
          {selectedPlace ? (
            <>
              <Check className="w-5 h-5 mr-2" />
              {selectedPlace.title} 선택 완료
            </>
          ) : (
            "장소를 선택해주세요"
          )}
        </button>

        <p className="text-xs text-center mt-2 text-gray-400">
          {selectedPlace
            ? "선택한 장소가 새 약속에 반영됩니다"
            : "약속 장소를 선택해주세요"}
        </p>
      </div>
    </div>
  );
}
