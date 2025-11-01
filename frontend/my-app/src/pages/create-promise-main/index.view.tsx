import React from "react";
import TopBar from "@/components/ui/top-bar";
import SectionHeader from "@/components/ui/section-header";
import Button from "@/components/ui/button";
import Card from "@/components/ui/card";
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
        <Card className={styles.heroCard}>로딩 중…</Card>
      </div>
    );
  }

  private renderError(msg: string) {
    return (
      <div className={styles.container}>
        <TopBar title="약속 상세" />
        <Card className={styles.heroCard}>에러: {msg}</Card>
      </div>
    );
  }

  private renderHeroCard(title: string, ddayLabel: string) {
    return (
      <Card className={styles.heroCard}>
        <div className={styles.badgeWrap}>
          <Badge color="danger">{ddayLabel}</Badge>
        </div>
        <h2 className={styles.heroTitle}>{title}</h2>
      </Card>
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
        <Card className={styles.courseCard}>{summary}</Card>
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
        {this.renderHeroCard(data.title, data.ddayLabel)}
        {this.renderParticipantsSection(data.participants)}
        {this.renderScheduleSection(dateLabel)}
        {this.renderCourseSection(data.course.text)}
        <div className={styles.bottomSpacer} />
      </div>
    );
  }
}
