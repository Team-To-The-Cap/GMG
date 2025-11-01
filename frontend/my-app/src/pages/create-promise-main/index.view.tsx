import React from "react";
import TopBar from "@/components/ui/top-bar";
import SectionHeader from "@/components/ui/section-header";
import Button from "@/components/ui/button";
import PromiseCard from "@/components/ui/promise-card";
import Avatar from "@/components/ui/avatar";
import Badge from "@/components/ui/badge";
import { UserIcon, CalendarIcon, MapIcon } from "@/assets/icons/icons";
import styles from "./style.module.css";
import type { Participant, PromiseDetail } from "@/types/promise";

type Props = {
  loading: boolean;
  error?: string;
  data?: PromiseDetail;
  onEditParticipants?: () => void;
  onEditSchedule?: () => void;
  onEditCourse?: () => void;
};

export default class CreatePromiseMainView extends React.PureComponent<Props> {
  private renderSkeleton() {
    return (
      <div className={styles.container}>
        <TopBar title="약속 상세" />
        <PromiseCard className={styles.heroCard}>로딩 중…</PromiseCard>
      </div>
    );
  }

  private renderError(msg: string) {
    return (
      <div className={styles.container}>
        <TopBar title="약속 상세" />
        <PromiseCard className={styles.heroCard}>에러: {msg}</PromiseCard>
      </div>
    );
  }

  private renderHeroCard(title: string, dday: number) {
    return (
      <PromiseCard title={title} dday={dday} className={styles.heroCard}>
        {/* 카드 본문 */}
      </PromiseCard>
    );
  }

  private renderParticipantsSection(participants: Participant[]) {
    const { onEditParticipants } = this.props;
    return (
      <section className={styles.section}>
        <SectionHeader
          icon={<UserIcon />}
          title="참석자 명단"
          action={
            <Button variant="ghost" onClick={onEditParticipants}>
              수정하러 가기
            </Button>
          }
        />
        <ul className={styles.participantGrid}>
          {participants.map((p) => (
            <li key={p.id} className={styles.participantItem}>
              <Avatar src={p.avatarUrl} alt={p.name} />
              <span>{p.name}</span>
            </li>
          ))}
        </ul>
      </section>
    );
  }

  private renderScheduleSection(dateLabel: string) {
    const { onEditSchedule } = this.props;
    return (
      <section className={styles.section}>
        <SectionHeader
          icon={<CalendarIcon />}
          title="일정"
          action={
            <Button variant="ghost" onClick={onEditSchedule}>
              수정하러 가기
            </Button>
          }
        />
        <div className={styles.scheduleText}>{dateLabel}</div>
      </section>
    );
  }

  private renderCourseSection(summary: string) {
    const { onEditCourse } = this.props;
    return (
      <section className={styles.section}>
        <SectionHeader
          icon={<MapIcon />}
          title="코스"
          action={
            <Button variant="ghost" onClick={onEditCourse}>
              수정하러 가기
            </Button>
          }
        />
        <PromiseCard className={styles.courseCard}>{summary}</PromiseCard>
      </section>
    );
  }

  render() {
    const { loading, error, data } = this.props;

    if (loading) return this.renderSkeleton();
    if (error) return this.renderError(error);
    if (!data) return this.renderError("데이터가 없습니다.");

    const dateLabel = new Date(data.schedule.dateISO).toLocaleDateString(
      "ko-KR",
      {
        year: "numeric",
        month: "long",
        day: "numeric",
      }
    );

    return (
      <div className={styles.container}>
        <TopBar title={`${data.title} 상세`} />
        {this.renderHeroCard(data.title, data.dday)}
        {this.renderParticipantsSection(data.participants)}
        {this.renderScheduleSection(dateLabel)}
        {this.renderCourseSection(data.course.text)}
        <div className={styles.bottomSpacer} />
      </div>
    );
  }
}
