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
  EditIcon, // ← 아이콘 사용
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

  /** 제목 변경을 외부로 전달하고 싶다면 선택적으로 제공 */
  onChangeTitle?: (value: string) => void;
  /** 기존 버튼 유지하려면 그대로 둠(선택) */
  onEditTitle?: () => void;
  onRemoveParticipant?: (id: string) => void;
};

type State = {
  titleDraft: string; // 로컬 입력값
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

export default class CreatePromiseMainView extends React.PureComponent<
  Props,
  State
> {
  state: State = {
    titleDraft: this.props.data?.title ?? "",
  };

  // props.data가 바뀌면 초깃값 동기화(직접 타이핑 중일 때는 유지)
  componentDidUpdate(prevProps: Props) {
    if (prevProps.data?.title !== this.props.data?.title) {
      // 사용자가 직접 수정 중(포커스/입력)이라면 굳이 덮어쓰지 않음.
      // 여기서는 단순화: 외부 데이터가 바뀌면 드래프트 갱신
      this.setState({ titleDraft: this.props.data?.title ?? "" });
    }
  }

  private commitTitle = () => {
    const { onChangeTitle } = this.props;
    const value = this.state.titleDraft.trim();
    onChangeTitle?.(value);
  };

  private handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    this.setState({ titleDraft: e.target.value });
  };

  private handleTitleBlur = () => {
    this.commitTitle();
  };

  private handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      (e.target as HTMLInputElement).blur();
    } else if (e.key === "Escape") {
      // ESC 누르면 원복
      this.setState({ titleDraft: this.props.data?.title ?? "" }, () => {
        (e.target as HTMLInputElement).blur();
      });
    }
  };

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

  // ✅ 약속 이름 섹션 (입력 가능)
  private renderTitleSection(nameFromData: string) {
    const { onEditTitle } = this.props;
    const { titleDraft } = this.state;

    return (
      <section className={styles.section}>
        <SectionHeader
          icon={<ResultIcon />}
          title="약속 이름"
          size="sm"
          action={
            <Button
              variant="ghost"
              size="xs"
              iconLeft={<EditIcon width={16} height={16} />}
              onClick={onEditTitle}
            >
              저장
            </Button>
          }
        />
        {/* input 처럼 보이는 텍스트 입력 */}
        <input
          type="text"
          className={`${styles.inputLike} ${styles.inputReset}`}
          placeholder="이름을 입력하세요"
          value={titleDraft}
          onChange={this.handleTitleChange}
          onBlur={this.handleTitleBlur}
          onKeyDown={this.handleTitleKeyDown}
          aria-label="약속 이름"
        />
      </section>
    );
  }

  private renderParticipantsSection(participants: Participant[]) {
    const { onEditParticipants, onAddParticipant, onRemoveParticipant } =
      this.props;
    return (
      <section className={styles.section}>
        <SectionHeader icon={<UserIcon />} title="참석자 명단" size="sm" />
        <ul className={styles.participantGrid}>
          {participants.map((p) => (
            <li key={p.id} className={styles.participantItem}>
              <div className={styles.avatarWrap}>
                <Avatar src={p.avatarUrl} alt={p.name} />
                <button
                  type="button"
                  className={styles.removeBtn}
                  aria-label={`${p.name} 삭제`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveParticipant?.(p.id);
                  }}
                >
                  ×
                </button>
              </div>
              <span className={styles.participantItemName}>{p.name}</span>
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
            <Button variant="ghost" size="xs" onClick={onEditSchedule}>
              수정하러 가기
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
            <Button variant="ghost" size="xs" onClick={onEditPlace}>
              수정하러 가기
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
            <Button variant="ghost" size="xs" onClick={onEditCourse}>
              수정하러 가기
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
        {this.renderTitleSection(data.title)} {/* ✅ 입력 가능 */}
        {this.renderParticipantsSection(data.participants)}{" "}
        {/* 기존 참석자 섹션 */}
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
