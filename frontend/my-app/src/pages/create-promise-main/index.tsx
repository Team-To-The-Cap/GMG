import React from "react";

import TopBar from "@/components/ui/top-bar";
import SectionHeader from "@/components/ui/section-header";
import Button from "@/components/ui/button";
import Card from "@/components/ui/card";
import Avatar from "@/components/ui/avatar";
import Badge from "@/components/ui/badge";
import { UserIcon, CalendarIcon, MapIcon } from "@/assets/icons/icons";
import styles from "./style.module.css";

type Participant = { name: string; img: number };

export default class CreatePromiseMain extends React.PureComponent {
  // ───────────── 데이터(상수) ─────────────
  private participants: Participant[] = [
    { name: "라이언", img: 1 },
    { name: "어피치", img: 2 },
    { name: "무지", img: 4 },
    { name: "네오", img: 3 },
  ];

  // ───────────── 섹션 렌더러들 ─────────────
  private renderHeroCard() {
    return (
      <Card className={styles.heroCard}>
        <div className={styles.badgeWrap}>
          <Badge color="danger">D-1</Badge>
        </div>

        <h2 className={styles.heroTitle}>신촌에서 약속</h2>

        <div className={styles.avatars}>
          <Avatar src="https://i.pravatar.cc/40?img=1" alt="라이언" />
          <Avatar src="https://i.pravatar.cc/40?img=2" alt="어피치" />
          <Avatar src="https://i.pravatar.cc/40?img=3" alt="네오" />
          <div className={styles.more}>+1</div>
        </div>
      </Card>
    );
  }

  private renderParticipantsSection() {
    return (
      <section className={styles.section}>
        <SectionHeader
          icon={<UserIcon />}
          title="참석자 명단"
          action={<Button variant="ghost">수정하러 가기</Button>}
        />
        <ul className={styles.participantGrid}>
          {this.participants.map((p) => (
            <li key={p.name} className={styles.participantItem}>
              <Avatar
                src={`https://i.pravatar.cc/40?img=${p.img}`}
                alt={p.name}
              />
              <span>{p.name}</span>
            </li>
          ))}
        </ul>
      </section>
    );
  }

  private renderScheduleSection() {
    return (
      <section className={styles.section}>
        <SectionHeader
          icon={<CalendarIcon />}
          title="일정"
          action={<Button variant="ghost">수정하러 가기</Button>}
        />
        <div className={styles.scheduleText}>2025년 10월 27일</div>
      </section>
    );
  }

  private renderCourseSection() {
    return (
      <section className={styles.section}>
        <SectionHeader
          icon={<MapIcon />}
          title="코스"
          action={<Button variant="ghost">수정하러 가기</Button>}
        />
        <Card className={styles.courseCard}>코스 요약 영역</Card>
      </section>
    );
  }

  // ───────────── 최상위 렌더 ─────────────
  render() {
    return (
      <div className={styles.container}>
        <TopBar title="신촌에서의 약속 상세" />
        {this.renderHeroCard()}
        {this.renderParticipantsSection()}
        {this.renderScheduleSection()}
        {this.renderCourseSection()}
        <div className={styles.bottomSpacer} />
      </div>
    );
  }
}
