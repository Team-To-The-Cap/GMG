// src/pages/participants/add-start/index.tsx
import React, { useState } from "react";
import TopBar from "@/components/ui/top-bar";
import Button from "@/components/ui/button";
import styles from "./style.module.css";
import {
  CalendarIcon,
  PinIcon,
  HeartIcon,          // ✅ 하트 아이콘으로 교체
} from "@/assets/icons/icons";

export default function AddParticipantStartPage() {
  const [name, setName] = useState("");

  const openSchedulePicker = () => { /* ... */ };
  const openOriginPicker = () => { /* ... */ };
  const openPreferencePicker = () => { /* ... */ };

  const submit = () => { /* ... */ };

  return (
    <div className={styles.container}>
      <TopBar title="참가자 추가" />

      <label className={styles.label} htmlFor="name">이름 *</label>
      <input
        id="name"
        className={styles.input}
        placeholder="이름을 입력하세요"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      <button className={styles.rowBtn} onClick={openSchedulePicker}>
        <span className={styles.icon}><CalendarIcon /></span>
        <span className={styles.rowText}>일정 입력하기</span>
      </button>

      <button className={styles.rowBtn} onClick={openOriginPicker}>
        <span className={styles.icon}><PinIcon /></span>
        <span className={styles.rowText}>출발장소 입력하기</span>
      </button>

      {/* ✅ 하트 아이콘 사용 */}
      <button className={styles.rowBtn} onClick={openPreferencePicker}>
        <span className={`${styles.icon} ${styles.heartIcon}`}>
          <HeartIcon />
        </span>
        <span className={styles.rowText}>선호 입력하기</span>
      </button>

      {/* ✅ 가운데 정렬 */}
      <div className={styles.footer}>
        <Button
          variant="primary"
          size="lg"
          className={styles.saveBtn}   // ← 폭/정렬 제어
          disabled={!name.trim()}
          onClick={submit}
        >
          저장하기
        </Button>
      </div>
    </div>
  );
}
