import React from "react";
import TopBar from "@/components/ui/top-bar";
import SectionHeader from "@/components/ui/section-header";
import Button from "@/components/ui/button";
import PromiseCard from "@/components/ui/promise-card";
import Avatar from "@/components/ui/avatar";
import {
  UserIcon,
  CalendarIcon,
  MapIcon,
  PinIcon,
  ResultIcon,
  EditIcon,
} from "@/assets/icons/icons";
import styles from "./style.module.css";
import type { Participant, PromiseDetail } from "@/types/promise";
import CourseSummaryCard from "@/components/ui/course-summary-card";
import CourseDetailList from "@/components/ui/course-detail-list"; // ✅ 타임라인

type Props = {
  loading: boolean;
  error?: string;
  data?: PromiseDetail;
  onEditParticipants?: () => void;
  onEditSchedule?: () => void;
  onEditPlace?: () => void;
  onEditCourse?: () => void;
  onAddParticipant?: () => void;
  onEditTitle?: () => void; // ✅ 약속 이름 편집 콜백 추가
};

/* ================================
   Helpers: summary 계산 / 타입가드
   ================================ */
type VisitItem = { type: "visit"; stayMinutes: number };
type TransferItem = { type: "transfer"; minutes: number };

function summarizeFromItems(items: Array<VisitItem | TransferItem> = []) {
  let activity = 0,
    travel = 0;
  for (const it of items) {
    if (it.type === "visit") activity += it.stayMinutes;
    else if (it.type === "transfer") travel += it.minutes;
  }
  return {
    totalMinutes: activity + travel,
    activityMinutes: activity,
    travelMinutes: travel,
  };
}

function isCourseWithItems(
  course: PromiseDetail["course"] | { text: string }
): course is PromiseDetail["course"] & {
  items: Array<VisitItem | TransferItem>;
} {
  return Array.isArray((course as any)?.items);
}

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

  private renderHeroCard(
    title: string,
    dday: number,
    participants: Participant[]
  ) {
    return (
      <PromiseCard
        title={title}
        dday={dday}
        participants={participants}
        className={styles.heroCard}
      >
        {/* 카드 본문 */}
      </PromiseCard>
    );
  }

  // ✅ 약속 이름 섹션
  private renderTitleSection(name: string) {
    const { onEditTitle } = this.props;
    return (
      <section className={styles.section}>
        <SectionHeader
          icon={<ResultIcon />} // 필요하면 전용 아이콘으로 교체 가능
          title="약속 이름"
          size="sm"
          action={
            <Button
              variant="ghost"
              size="xs"
              iconLeft={<EditIcon width={16} height={16} />}
            >
              수정
            </Button>
          }
        />
        <div
          className={styles.inputLike}
          tabIndex={0}
          role="textbox"
          aria-readonly="true"
        >
          {name ? (
            <span>{name}</span>
          ) : (
            <span className={styles.placeholder}>이름 미정</span>
          )}
        </div>
      </section>
    );
  }

  private renderParticipantsSection(participants: Participant[]) {
    const { onEditParticipants, onAddParticipant } = this.props;
    return (
      <section className={styles.section}>
        <SectionHeader
          icon={<UserIcon />}
          title="참석자 명단"
          size="sm"
          action={
            <Button
              variant="ghost"
              size="xs"
              iconLeft={<EditIcon width={16} height={16} />}
            >
              수정
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
        <Button
          variant="primary"
          size="sm"
          style={{ width: "97%", display: "block", margin: "0 auto" }}
          onClick={onAddParticipant}
        >
          새로운 인원 추가하기
        </Button>
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
            <Button
              variant="ghost"
              size="xs"
              iconLeft={<EditIcon width={16} height={16} />}
            >
              수정
            </Button>
          }
        />
        <div className={styles.scheduleText}>{dateLabel}</div>
      </section>
    );
  }

  private renderPlaceSection(placeLabel: string) {
    const { onEditPlace } = this.props;
    return (
      <section className={styles.section}>
        <SectionHeader
          icon={<PinIcon />}
          title="장소"
          action={
            <Button
              variant="ghost"
              size="xs"
              iconLeft={<EditIcon width={16} height={16} />}
            >
              수정
            </Button>
          }
        />
        <div className={styles.placeText}>{placeLabel}</div>
      </section>
    );
  }

  // ✅ 코스: data.course를 그대로 사용. summary 없으면 items로 계산
  private renderCourseSection(course: PromiseDetail["course"]) {
    const { onEditCourse } = this.props;

    const items = isCourseWithItems(course) ? course.items : [];
    const summary = isCourseWithItems(course)
      ? course.summary ?? summarizeFromItems(items)
      : { totalMinutes: 0, activityMinutes: 0, travelMinutes: 0 };

    return (
      <section className={styles.section}>
        <SectionHeader
          icon={<MapIcon />}
          title="코스"
          action={
            <Button
              variant="ghost"
              size="xs"
              iconLeft={<EditIcon width={16} height={16} />}
            >
              수정
            </Button>
          }
        />

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <CourseSummaryCard
            totalMinutes={summary.totalMinutes}
            activityMinutes={summary.activityMinutes}
            travelMinutes={summary.travelMinutes}
            className={styles.courseCard}
          />
          <CourseDetailList items={items} />
        </div>
      </section>
    );
  }

  private renderCalculateButton() {
    return (
      <Button variant="primary" size="lg" style={{ width: "97%" }}>
        일정, 장소, 코스 계산하기
      </Button>
    );
  }

  render() {
    const { loading, error, data } = this.props;

    if (loading) return this.renderSkeleton();
    if (error) return this.renderError(error);
    if (!data) return this.renderError("데이터가 없습니다.");

    const dateLabel = new Date(data.schedule.dateISO).toLocaleDateString(
      "ko-KR",
      { year: "numeric", month: "long", day: "numeric" }
    );

    const placeLabel = data.place?.name ?? "장소 미정";

    return (
      <div className={styles.container}>
        <TopBar title={`새로운 약속 추가`} />

        {/* {this.renderHeroCard(data.title, data.dday, data.participants ?? [])} */}
        <section className={styles.section}>
          <SectionHeader title="새로운 약속을 만들어 보세요" size="md" />
          <div className={styles.sectionInner}>
            {this.renderTitleSection(data.title)} {/* ✅ 추가된 섹션 */}
            {this.renderParticipantsSection(data.participants)}{" "}
          </div>
        </section>

        {/* 결과 블록 */}
        <section className={styles.section}>
          <SectionHeader icon={<ResultIcon />} title="결과" size="md" />
          <div className={styles.sectionInner}>
            {this.renderScheduleSection(dateLabel)}
            {this.renderPlaceSection(placeLabel)}
            {this.renderCourseSection(data.course)} {/* ✅ course 객체 전달 */}
            {this.renderCalculateButton()}
          </div>
        </section>
        <div className={styles.bottomSpacer} />
      </div>
    );
  }
}
