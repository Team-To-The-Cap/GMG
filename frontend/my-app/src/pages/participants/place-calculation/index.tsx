import { useState } from 'react';
import { MapPin, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { motion, AnimatePresence } from "framer-motion";
import type { PanInfo } from "framer-motion";

interface PlaceCandidate {
  id: string;
  name: string;
  address: string;
  detailedAddress: string;
  lat: number;
  lng: number;
  averageDistance: string;
  description: string;
}

const mockPlaces: PlaceCandidate[] = [
  {
    id: '1',
    name: '강남역 2번 출구',
    address: '서울 강남구 강남대로 396',
    detailedAddress: '강남역 2번 출구 앞',
    lat: 37.498,
    lng: 127.028,
    averageDistance: '모든 참여자로부터 평균 2.5km',
    description: '접근성이 가장 좋은 위치',
  },
  {
    id: '2',
    name: '신논현역 스타벅스',
    address: '서울 강남구 강남대로 536',
    detailedAddress: '신논현역 6번 출구 맞은편',
    lat: 37.504,
    lng: 127.025,
    averageDistance: '모든 참여자로부터 평균 2.8km',
    description: '카페가 있어 편리한 위치',
  },
  {
    id: '3',
    name: '역삼역 CGV',
    address: '서울 강남구 테헤란로 134',
    detailedAddress: '역삼역 2번 출구',
    lat: 37.500,
    lng: 127.036,
    averageDistance: '모든 참여자로부터 평균 3.0km',
    description: '다양한 편의시설이 있는 위치',
  },
];

export function PlaceCalculationScreen() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [selectedPlace, setSelectedPlace] = useState<PlaceCandidate | null>(null);
  const [dragDirection, setDragDirection] = useState(0);

  const handleNext = () => {
    if (currentSlide < mockPlaces.length - 1) {
      setCurrentSlide(currentSlide + 1);
    }
  };

  const handlePrev = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const swipeThreshold = 50;
    if (info.offset.x > swipeThreshold && currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    } else if (info.offset.x < -swipeThreshold && currentSlide < mockPlaces.length - 1) {
      setCurrentSlide(currentSlide + 1);
    }
  };

  const handleConfirm = () => {
    if (selectedPlace) {
      console.log('선택된 장소:', selectedPlace);
      // Handle place confirmation
    }
  };

  const currentPlace = mockPlaces[currentSlide];

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-background">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4 shrink-0">
        <h1 className="font-bold text-center">만남 장소 산출 결과</h1>
        <p className="text-sm text-gray-600 text-center mt-1">
          모든 참여자를 고려한 최적의 장소입니다
        </p>
      </div>

      {/* Map Section */}
      <div className="relative bg-gray-100 h-64 shrink-0">
        {/* Simple map visualization */}
        <div className="absolute inset-0 bg-linear-to-br from-blue-50 to-green-50">
          {/* Grid pattern to simulate map */}
          <div 
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: `
                linear-gradient(to right, #3A7DFF 1px, transparent 1px),
                linear-gradient(to bottom, #3A7DFF 1px, transparent 1px)
              `,
              backgroundSize: '40px 40px'
            }}
          />
          
          {/* Animated location marker */}
          <div 
            className="absolute transition-all duration-500 ease-out"
            style={{
              left: `${40 + currentSlide * 15}%`,
              top: `${45 + (currentSlide % 2) * 10}%`,
              transform: 'translate(-50%, -100%)'
            }}
          >
            <div className="relative">
              {/* Pulse animation */}
              <div className="absolute inset-0 -m-2">
                <div className="w-12 h-12 bg-primary/30 rounded-full animate-ping" />
              </div>
              {/* Marker */}
              <div className="relative w-12 h-12 bg-primary rounded-full flex items-center justify-center shadow-lg border-4 border-white">
                <MapPin className="w-6 h-6 text-white" />
              </div>
              {/* Marker label */}
              <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 whitespace-nowrap bg-white px-3 py-1.5 rounded-lg shadow-md">
                <p className="text-xs font-medium text-gray-900">{currentPlace.name}</p>
              </div>
            </div>
          </div>

          {/* Other participant markers (smaller, faded) */}
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="absolute"
              style={{
                left: `${20 + i * 15}%`,
                top: `${30 + (i % 3) * 20}%`,
                transform: 'translate(-50%, -100%)'
              }}
            >
              <div className="w-6 h-6 bg-gray-400 rounded-full border-2 border-white shadow-sm" />
            </div>
          ))}
        </div>

        {/* Distance indicator */}
        <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-sm px-4 py-2 rounded-xl shadow-md">
          <div className="flex items-center">
            <div className="w-2 h-2 bg-primary rounded-full mr-2" />
            <span className="text-sm font-medium text-gray-700">
              {currentPlace.averageDistance}
            </span>
          </div>
        </div>

        {/* Slide counter */}
        <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-md">
          <span className="text-sm font-medium text-gray-900">
            {currentSlide + 1} / {mockPlaces.length}
          </span>
        </div>
      </div>

      {/* Card Slider Section */}
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
                  initial={{ opacity: 0, scale: 0.9, x: dragDirection > 0 ? 300 : -300 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.9, x: dragDirection > 0 ? -300 : 300 }}
                  transition={{ duration: 0.3 }}
                  className="w-full"
                >
                  <div
                    onClick={() => setSelectedPlace(mockPlaces[currentSlide])}
                    className={`
                      bg-white rounded-2xl shadow-lg p-6 cursor-pointer transition-all duration-300 mx-4
                      ${selectedPlace?.id === mockPlaces[currentSlide].id ? 'ring-4 ring-[#828bbb] shadow-lg' : 'hover:shadow-xl'}
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
                      <h3 className="font-bold text-gray-900 pr-4">
                        {mockPlaces[currentSlide].name}
                      </h3>
                      {selectedPlace?.id === mockPlaces[currentSlide].id && (
                        <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center shrink-0">
                          <Check className="w-4 h-4 text-white" />
                        </div>
                      )}
                    </div>

                    {/* Address */}
                    <div className="space-y-2 mb-4">
                      <div className="flex items-start">
                        <MapPin className="w-4 h-4 text-gray-400 mr-2 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-sm text-gray-900">{mockPlaces[currentSlide].address}</p>
                          <p className="text-sm text-gray-600">{mockPlaces[currentSlide].detailedAddress}</p>
                        </div>
                      </div>
                    </div>

                    {/* Description */}
                    <div className="bg-blue-50 rounded-xl p-3">
                      <p className="text-sm text-gray-700">
                        {mockPlaces[currentSlide].description}
                      </p>
                    </div>

                    {/* Distance info */}
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <p className="text-xs text-gray-600">{mockPlaces[currentSlide].averageDistance}</p>
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
              
              {currentSlide < mockPlaces.length - 1 && (
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
            onClick={() => {
              setDragDirection(1);
              handlePrev();
            }}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50 transition-colors z-10"
          >
            <ChevronLeft className="w-5 h-5 text-gray-700" />
          </button>
        )}
        
        {currentSlide < mockPlaces.length - 1 && (
          <button
            onClick={() => {
              setDragDirection(-1);
              handleNext();
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50 transition-colors z-10"
          >
            <ChevronRight className="w-5 h-5 text-gray-700" />
          </button>
        )}

        {/* Swipe indicator */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
          <div className="flex space-x-2">
            {mockPlaces.map((_, index) => (
              <button
                key={index}
                onClick={() => {
                  setDragDirection(index > currentSlide ? -1 : 1);
                  setCurrentSlide(index);
                }}
                className={`h-2 rounded-full transition-all duration-300 ${
                  index === currentSlide ? 'w-6 bg-primary' : 'w-2 bg-gray-300'
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
            ${selectedPlace
              ? 'bg-primary text-white bg-blue-600 shadow-md'
              : 'bg-gray-400 text-white cursor-not-allowed'
            }
          `}
        >
          {selectedPlace ? (
            <>
              <Check className="w-5 h-5 mr-2" />
              {selectedPlace.name} 선택 완료
            </>
          ) : (
            '장소를 선택해주세요'
          )}
        </button>
        
        {/* 안내 문구 — 선택 여부에 따라 내용만 변경 */}
         <p
         className={`text-xs text-center mt-2 transition-colors duration-300 ${
         selectedPlace ? 'text-gray-400' : 'text-gray-400'
        }`}
        >
        {selectedPlace
          ? '선택한 장소가 새 약속에 반영됩니다'
          : '약속 장소를 선택해주세요'}
        </p>
      </div>
    </div>
  );
}
