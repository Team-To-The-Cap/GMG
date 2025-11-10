// src/components/ui/swipeable-card/index.tsx
import type { ReactNode } from "react";
import { useRef, useState } from "react";
import styles from "./style.module.css";
import { TrashIcon } from "@/assets/icons/icons";

type Props = {
  /** 카드 안에 들어갈 실제 콘텐츠 (보통 카드 컴포넌트) */
  children: ReactNode;

  /** 드래그가 아닌 '탭'으로 인식될 때 호출 (카드 클릭) */
  onCardClick?: () => void;

  /**
   * 오른쪽으로 스와이프해서 액션이 트리거될 때 호출
   * - 오른쪽 액션 버튼 클릭
   * - 혹은 왼쪽으로 많이 스와이프(deleteThreshold 넘김)
   */
  onDeleteRequest?: () => void;

  /** 오른쪽 액션 영역에 표시할 내용 (기본: TrashIcon) */
  rightAction?: ReactNode;
};

export default function SwipeableCard({
  children,
  onCardClick,
  onDeleteRequest,
  rightAction,
}: Props) {
  const [translateX, setTranslateX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startXRef = useRef(0);
  const movedRef = useRef(false);

  const maxSwipe = -120; // 카드가 왼쪽으로 최대 이동할 거리
  const revealThreshold = -50; // 이 이상 밀면 액션 버튼 노출
  const deleteThreshold = -160; // 이 이상 세게 밀면 바로 onDeleteRequest

  const handleStart = (clientX: number) => {
    setIsDragging(true);
    startXRef.current = clientX;
    movedRef.current = false;
  };

  const handleMove = (clientX: number) => {
    if (!isDragging) return;
    const dx = clientX - startXRef.current; // 오른쪽 양수, 왼쪽 음수

    if (Math.abs(dx) > 5) movedRef.current = true;

    // 오른쪽으로는 이동하지 않도록 0까지만 허용, 왼쪽은 maxSwipe까지
    const clamped = Math.max(maxSwipe, Math.min(0, dx));
    setTranslateX(clamped);
  };

  const handleEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);

    // 많이 민 경우 → 바로 액션 트리거
    if (translateX <= deleteThreshold) {
      setTranslateX(0);
      onDeleteRequest?.();
      return;
    }

    // revealThreshold 이상 밀었으면 버튼 보여주는 위치에서 멈춤
    if (translateX <= revealThreshold) {
      setTranslateX(-80);
    } else {
      // 거의 안 밀었으면 원위치
      setTranslateX(0);
    }
  };

  // 마우스 이벤트 핸들러
  const onMouseDown = (e: React.MouseEvent) => {
    handleStart(e.clientX);
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    e.preventDefault(); // 드래그 중 텍스트 선택 방지
    handleMove(e.clientX);
  };
  const onMouseUp = () => {
    handleEnd();
  };
  const onMouseLeave = () => {
    if (isDragging) handleEnd();
  };

  // 터치 이벤트 핸들러
  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    if (!t) return;
    handleStart(t.clientX);
  };
  const onTouchMove = (e: React.TouchEvent) => {
    const t = e.touches[0];
    if (!t) return;
    handleMove(t.clientX);
  };
  const onTouchEnd = () => {
    handleEnd();
  };

  const handleClick = () => {
    // 드래그가 아닌 경우에만 클릭 처리
    if (!movedRef.current) {
      onCardClick?.();
    }
  };

  // 스와이프가 발생했을 때만 오른쪽 액션 버튼 노출
  const showAction = isDragging || translateX !== 0;

  return (
    <div className={styles.swipeWrapper}>
      {showAction && (
        <button
          type="button"
          className={styles.deleteAction}
          onClick={() => {
            setTranslateX(0);
            onDeleteRequest?.();
          }}
        >
          {/* 기본은 TrashIcon, 아니면 props로 받은 rightAction */}
          {rightAction ?? <TrashIcon title="삭제" />}
        </button>
      )}

      <div
        className={styles.swipeContent}
        style={{ transform: `translateX(${translateX}px)` }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseLeave}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onClick={handleClick}
      >
        {children}
      </div>
    </div>
  );
}
