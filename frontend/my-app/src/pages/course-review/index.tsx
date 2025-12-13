// src/pages/course-review/index.tsx

import { useEffect, useRef, useState } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { MapPin, ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { PanInfo } from "framer-motion";

declare global {
  interface Window {
    naver: any;
  }
}

interface CourseVisitItem {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  stayMinutes: number;
  order: number;   // 방문 순서
}


export default function CourseReviewScreen() {
  const location = useLocation();

  // PromiseDetailPage에서 코스를 넘겨 받을 것
  const courseItems = (location.state?.courseItems ?? []) as CourseVisitItem[];

  const [visits, setVisits] = useState<CourseVisitItem[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);

  const mapRef = useRef<HTMLDivElement | null>(null);
  const naverMapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const directionRef = useRef(0);

  const currentPlace = visits[currentSlide];

  const cardVariants = {
    enter: (direction: number) => ({
      opacity: 0,
      scale: 0.9,
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
      x: direction === 0 ? 0 : direction > 0 ? -300 : 300,
    }),
  };

  

  // 🔹 1) 방문 장소만 세팅
  useEffect(() => {
    const onlyVisits = courseItems.map((it, idx) => ({
      id: it.id,
      name: it.name,
      address: it.address,
      lat: it.lat,
      lng: it.lng,
      stayMinutes: it.stayMinutes,
      order: idx + 1,
    }));
    setVisits(onlyVisits);
  }, [courseItems]);

  // 🔹 2) 네이버 지도 초기화 / 마커 표시
  useEffect(() => {
    if (!window.naver || !mapRef.current || visits.length === 0) return;

    if (!naverMapRef.current) {
      const c = visits[0];
      const center = new window.naver.maps.LatLng(c.lat, c.lng);

      const map = new window.naver.maps.Map(mapRef.current, {
        center,
        zoom: 14,
      });
      naverMapRef.current = map;

      requestAnimationFrame(() => {
        window.naver.maps.Event.trigger(map, "resize");
        map.setCenter(center);
      });
    }

    const map = naverMapRef.current;

    // 기존 마커 제거
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

     // ⭐ 새 번호 마커 표시 ⭐
  markersRef.current = visits.map((v, idx) => {
    const order = idx + 1;

    return new window.naver.maps.Marker({
      position: new window.naver.maps.LatLng(v.lat, v.lng),
      map,

      // 🔥 HTML 기반 숫자 마커
      icon: {
        content: `
          <div
            style="
              background-color: #3b82f6;
              color: white;
              width: 28px;
              height: 28px;
              border-radius: 50%;
              display: flex;
              justify-content: center;
              align-items: center;
              font-size: 14px;
              font-weight: bold;
              border: 2px solid white;
              box-shadow: 0px 2px 6px rgba(0,0,0,0.25);
            "
          >
            ${order}
          </div>
        `,
        anchor: new window.naver.maps.Point(14, 14),
      },
    });
  });
  
    // =============================
  // 🔥 방문 장소들을 순서대로 연결하는 Polyline 추가
  // =============================
  const path = visits.map(v => new window.naver.maps.LatLng(v.lat, v.lng));

// 2) 기존 polyline 있으면 제거
if (naverMapRef.current._coursePolyline) {
  naverMapRef.current._coursePolyline.setMap(null);
}

// 3) 새 polyline 생성
naverMapRef.current._coursePolyline = new window.naver.maps.Polyline({
  map: naverMapRef.current,   // <= 여기 중요!!
  path,
  strokeColor: "#1E90FF",
  strokeOpacity: 0.9,
  strokeWeight: 4,
});


    return () => {
      markersRef.current.forEach((m) => m.setMap(null));
      markersRef.current = [];
    };
  }, [visits]);

  // 🔹 3) 슬라이드 변경 → 지도 이동
  useEffect(() => {
    if (!naverMapRef.current || !visits[currentSlide]) return;

    const p = visits[currentSlide];
    const center = new window.naver.maps.LatLng(p.lat, p.lng);
    naverMapRef.current.setCenter(center);
  }, [currentSlide, visits]);

  // 🔹 4) 다음/이전/스와이프 이동
  const handleNext = () => {
    if (currentSlide < visits.length - 1) {
      directionRef.current = 1;
      setCurrentSlide((prev) => prev + 1);
    }
  };
  const handlePrev = () => {
    if (currentSlide > 0) {
      directionRef.current = -1;
      setCurrentSlide((prev) => prev - 1);
    }
  };

  const handleDragEnd = (_: any, info: PanInfo) => {
    if (info.offset.x > 50 && currentSlide > 0) {
      directionRef.current = -1;
      setCurrentSlide((prev) => prev - 1);
    } else if (info.offset.x < -50 && currentSlide < visits.length - 1) {
      directionRef.current = 1;
      setCurrentSlide((prev) => prev + 1);
    }
  };

  if (!visits.length) {
    return (
      <div className="flex-1 flex items-center justify-center">
        표시할 코스 장소가 없습니다.
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b px-4 py-4 shrink-0">
        <p className="text-sm font-bold text-gray-800 text-center mt-1">
          추천된 코스의 방문 장소들을 확인하세요
        </p>
      </div>

      {/* Map */}
      <div className="relative h-[45vh] shrink-0">
        <div ref={mapRef} className="w-full h-full" />

        {/* 순서 표시 */}
        <div className="absolute top-4 left-4 bg-white/90 px-4 py-2 rounded-xl shadow-md">
          <span className="font-medium text-gray-800">
            방문 순서: {currentPlace.order}번
          </span>
        </div>

        {/* Slide number */}
        <div className="absolute top-4 right-4 bg-white/90 px-3 py-1.5 rounded-full shadow-md">
          {currentSlide + 1} / {visits.length}
        </div>
      </div>

      {/* Card Slider */}
      <div className="flex-1 overflow-hidden py-3 relative">
        <div className="relative h-full px-2 flex items-center justify-center">
          <div className="w-full max-w-md relative">
            <AnimatePresence mode="wait" initial={false} custom={directionRef.current}>
              <motion.div
                key={currentSlide}
                custom={directionRef.current}
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
                <div className="bg-white rounded-2xl shadow-lg p-6 mx-4">
                  {/* 제목 */}
                  <h3 className="font-bold text-lg">{currentPlace.name}</h3>

                  {/* 주소 */}
                  <div className="flex items-start mt-3">
                    <MapPin className="w-4 h-4 text-gray-400 mr-2 mt-0.5" />
                    <p className="text-sm text-gray-800">{currentPlace.address}</p>
                  </div>

                  {/* 체류 시간 */}
                  <p className="mt-4 text-sm text-gray-700">
                    예상 체류 시간: {currentPlace.stayMinutes}분
                  </p>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Prev/Next icons */}
            {currentSlide > 0 && (
              <button
                onClick={handlePrev}
                className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 opacity-70"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}
            {currentSlide < visits.length - 1 && (
              <button
                onClick={handleNext}
                className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 opacity-70"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
