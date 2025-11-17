import { useEffect, useRef, useState } from "react";
import { MapPin, ChevronLeft, ChevronRight, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useParams } from "react-router-dom";
import type { PanInfo } from "framer-motion";

declare global {
  interface Window {
    naver: any;
  }
}

interface PlaceCandidate {
  id: number;
  meetingId: number;
  name: string;
  address: string;
  lat: number;
  lng: number;
  category: string | null;
  duration: number | null;
  //averageDistance: string;
}

export function PlaceCalculationScreen() {
  const { promiseId } = useParams();
  const meetingId = Number(promiseId);

  const [places, setPlaces] = useState<PlaceCandidate[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [selectedPlace, setSelectedPlace] = useState<PlaceCandidate | null>(null);
  const [dragDirection, setDragDirection] = useState(0);

  const mapRef = useRef<HTMLDivElement | null>(null);
  const naverMapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  useEffect(() => {
    const fetchPlaces = async () => {
      try {
        const res = await fetch(
          `http://223.130.152.114:8001/meetings/${meetingId}/places`
        );
        const rawData = await res.json();

        const data: PlaceCandidate[] = rawData.map((item: any) => ({
          id: item.id,
          meetingId: item.meeting_id,
          name: item.name,
          address: item.address,
          lat: item.latitude,
          lng: item.longitude,
          category: item.category,
          duration: item.duration,
        }));


        setPlaces(data);
      } catch (err) {
        console.error("장소 불러오기 실패:", err);
      }
    };

    fetchPlaces();
  }, [meetingId]);

  const currentPlace = places[currentSlide];
  // 1) 네이버 지도 초기화 (처음 한 번)
  useEffect(() => {
    if (!window.naver || !mapRef.current || places.length === 0) return;

    const first = places[0];
    const center = new window.naver.maps.LatLng(first.lat, first.lng);

    const map = new window.naver.maps.Map(mapRef.current, {
      center,
      zoom: 14,
    });

    naverMapRef.current = map;

    // 마커 표시
    markersRef.current = places.map((p) => {
      return new window.naver.maps.Marker({
        position: new window.naver.maps.LatLng(p.lat, p.lng),
        map,
      });
    });

    requestAnimationFrame(() => {
      window.naver.maps.Event.trigger(map, "resize");
      map.setCenter(center);
    });

    return () => {
      markersRef.current.forEach((m) => m.setMap(null));
      markersRef.current = [];
    };
  }, [places]);

  // 2) 슬라이드 변경 시 해당 장소로 이동
  useEffect(() => {
    if (!window.naver || !naverMapRef.current || places.length === 0) return;

    const place = places[currentSlide];
    const center = new window.naver.maps.LatLng(place.lat, place.lng);
    naverMapRef.current.setCenter(center);
  }, [currentSlide, places]);

  /** 슬라이드 이동 */
  const handleNext = () => {
    if (currentSlide < places.length - 1) {
      setDragDirection(-1);
      setCurrentSlide(currentSlide + 1);
    }
  };

  const handlePrev = () => {
    if (currentSlide > 0) {
      setDragDirection(1);
      setCurrentSlide(currentSlide - 1);
    }
  };

  const handleDragEnd = (_event: any, info: PanInfo) => {
    const threshold = 50;

    if (info.offset.x > threshold && currentSlide > 0) {
      setDragDirection(1);
      setCurrentSlide(currentSlide - 1);
    } else if (info.offset.x < -threshold && currentSlide < places.length - 1) {
      setDragDirection(-1);
      setCurrentSlide(currentSlide + 1);
    }
  };

  const handleConfirm = () => {
    if (!selectedPlace) return;

    console.log("선택된 장소:", selectedPlace);
    alert(`${selectedPlace.name} 선택됨!`);
    // TODO: 상세 설정 페이지로 전달
  };

   if (places.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center text-gray-500">
        장소 데이터를 불러오는 중입니다…
      </div>
    );
  }
  

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-background">
      {/* Header */}
      <div className="bg-white border-b px-4 py-4 shrink-0">
        <h1 className="font-bold text-center">만남 장소 산출 결과</h1>
        <p className="text-sm text-gray-600 text-center mt-1">
          모든 참여자를 고려한 최적의 장소입니다
        </p>
      </div>

      {/* 지도 */}
      <div className="relative h-64 shrink-0">
        <div ref={mapRef} className="w-full h-full" />


        {/* 평균 거리 표기 */}
        <div className="absolute top-4 left-4 bg-white/90 px-4 py-2 rounded-xl shadow">
          <span className="text-sm font-medium text-gray-700">
            {200} 
          </span>
        </div>

        {/* 슬라이드 카운터 */}
        <div className="absolute top-4 right-4 bg-white/90 px-3 py-1.5 rounded-full shadow">
          {currentSlide + 1} / {places.length}
        </div>
      </div>

      {/* 카드 슬라이더 */}
      <div className="flex-1 overflow-hidden py-6 relative">
        <div className="relative h-full px-2">
          <div className="flex items-center justify-center h-full">
            <div className="w-full max-w-md relative">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={currentSlide}
                  drag="x"
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={0.2}
                  onDragEnd={handleDragEnd}
                  initial={{
                    opacity: 0,
                    scale: 0.9,
                    x: dragDirection > 0 ? 300 : -300,
                  }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  exit={{
                    opacity: 0,
                    scale: 0.9,
                    x: dragDirection > 0 ? -300 : 300,
                  }}
                  transition={{ duration: 0.3 }}
                >
                  <div
                    onClick={() => setSelectedPlace(currentPlace)}
                    className={`
                      bg-white rounded-2xl shadow-lg p-6 cursor-pointer mx-4 transition-all
                      ${
                        selectedPlace?.id === currentPlace.id
                          ? "ring-4 ring-[#828bbb]"
                          : "hover:shadow-xl"
                      }
                    `}
                  >
                    {/* 추천 뱃지 */}
                    {currentSlide === 0 && (
                      <div className="inline-flex mb-4 px-3 py-1 rounded-full bg-blue-100 text-blue-600 text-xs font-medium">
                        ⭐ 추천
                      </div>
                    )}

                    {/* 이름 */}
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="font-bold text-gray-900 pr-4">
                        {currentPlace.name}
                      </h3>
                      {selectedPlace?.id === currentPlace.id && (
                        <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                          <Check className="w-4 h-4 text-white" />
                        </div>
                      )}
                    </div>

                    {/* 주소 */}
                    <div className="space-y-2 mb-4">
                      <div className="flex items-start">
                        <MapPin className="w-4 h-4 text-gray-400 mr-2 mt-0.5" />
                        <p className="text-sm text-gray-900">{currentPlace.address}</p>
                      </div>
                    </div>

                    {/* 카테고리/시간 */}
                    <div className="bg-blue-50 rounded-xl p-3 text-sm text-gray-700">
                      {currentPlace.category ? `카테고리: ${currentPlace.category}` : ""}
                      {currentPlace.duration
                        ? ` / 예상 소요시간 ${currentPlace.duration}분`
                        : ""}
                    </div>

                    <div className="mt-4 pt-4 border-t text-xs text-gray-600">
                      {200}
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>

              {/* 미리보기 카드(좌우 흐릿하게) */}
              {currentSlide > 0 && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 opacity-30">
                  <div className="bg-white rounded-2xl shadow-md p-4 w-20 h-32 scale-75" />
                </div>
              )}
              {currentSlide < places.length - 1 && (
                <div className="absolute right-0 top-1/2 -translate-y-1/2 opacity-30">
                  <div className="bg-white rounded-2xl shadow-md p-4 w-20 h-32 scale-75" />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 좌우 버튼 */}
        {currentSlide > 0 && (
          <button
            onClick={handlePrev}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center"
          >
            <ChevronLeft />
          </button>
        )}

        {currentSlide < places.length - 1 && (
          <button
            onClick={handleNext}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center"
          >
            <ChevronRight />
          </button>
        )}
      </div>

      {/* 하단 버튼 */}
      <div className="border-t bg-white p-4">
        <button
          onClick={handleConfirm}
          disabled={!selectedPlace}
          className={`
            w-full py-4 rounded-3xl font-medium flex items-center justify-center
            transition-all
            ${
              selectedPlace
                ? "bg-blue-600 text-white"
                : "bg-gray-400 text-white cursor-not-allowed"
            }
          `}
        >
          {selectedPlace ? (
            <>
              <Check className="w-5 h-5 mr-2" />
              {selectedPlace.name} 선택 완료
            </>
          ) : (
            "장소를 선택해주세요"
          )}
        </button>
      </div>
    </div>
  );
}