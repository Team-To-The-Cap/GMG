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
import CourseDetailList from "@/components/ui/course-detail-list";

type Props = {
  loading: boolean;
  error?: string;
  data?: PromiseDetail;
  onEditParticipants?: () => void;
  onEditSchedule?: () => void;
  onEditPlace?: () => void;
  onEditCourse?: () => void;
  onAddParticipant?: () => void;

  onChangeTitle?: (value: string) => void;
  onEditTitle?: () => void;

  onChangeScheduleDate?: (valueISO: string) => void;
  onChangePlaceName?: (value: string) => void;

  onRemoveParticipant?: (id: string) => void;

  /** ✅ 추가: 하단 버튼 액션 */
  onCalculate?: () => void;
  onSave?: () => void;
};

type State = {
  titleDraft: string;
  scheduleDraft: string;
  placeDraft: string;
};

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

function toYMD(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default class CreatePromiseMainView extends React.PureComponent<
  Props,
  State
> {
  state: State = {
    titleDraft: this.props.data?.title ?? "",
    scheduleDraft: toYMD(this.props.data?.schedule?.dateISO),
    placeDraft: this.props.data?.place?.name ?? "",
  };

  componentDidUpdate(prevProps: Props) {
    if (prevProps.data?.title !== this.props.data?.title) {
      this.setState({ titleDraft: this.props.data?.title ?? "" });
    }
    if (
      prevProps.data?.schedule?.dateISO !== this.props.data?.schedule?.dateISO
    ) {
      this.setState({
        scheduleDraft: toYMD(this.props.data?.schedule?.dateISO),
      });
    }
    if (prevProps.data?.place?.name !== this.props.data?.place?.name) {
      this.setState({ placeDraft: this.props.data?.place?.name ?? "" });
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
    if (e.key === "Enter") (e.target as HTMLInputElement).blur();
    else if (e.key === "Escape") {
      this.setState({ titleDraft: this.props.data?.title ?? "" }, () => {
        (e.target as HTMLInputElement).blur();
      });
    }
  };

  private commitSchedule = () => {
    const { onChangeScheduleDate } = this.props;
    const value = this.state.scheduleDraft;
    if (!value) return;
    onChangeScheduleDate?.(value);
  };
  private handleScheduleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    this.setState({ scheduleDraft: e.target.value });
  };
  private handleScheduleBlur = () => {
    this.commitSchedule();
  };
  private handleScheduleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === "Enter") (e.target as HTMLInputElement).blur();
    else if (e.key === "Escape") {
      this.setState(
        { scheduleDraft: toYMD(this.props.data?.schedule?.dateISO) },
        () => (e.target as HTMLInputElement).blur()
      );
    }
  };

  private commitPlace = () => {
    const { onChangePlaceName } = this.props;
    const value = this.state.placeDraft.trim();
    onChangePlaceName?.(value);
  };
  private handlePlaceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    this.setState({ placeDraft: e.target.value });
  };
  private handlePlaceBlur = () => {
    this.commitPlace();
  };
  private handlePlaceKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") (e.target as HTMLInputElement).blur();
    else if (e.key === "Escape") {
      this.setState({ placeDraft: this.props.data?.place?.name ?? "" }, () => {
        (e.target as HTMLInputElement).blur();
      });
    }
  };

  private renderSkeleton() {
    return (
      <div className={styles.container}>
        <PromiseCard className={styles.heroCard}>로딩 중…</PromiseCard>
      </div>
    );
  }

  private renderError(msg: string) {
    return (
      <div className={styles.container}>
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

  private renderTitleSection(nameFromData: string) {
    const { titleDraft } = this.state;

    return (
      <section className={styles.section}>
        <SectionHeader icon={<ResultIcon />} title="약속 이름" size="sm" />
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
    const { onAddParticipant, onRemoveParticipant } = this.props;
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
          style={{ width: "95%", display: "block", margin: "0 auto" }}
          onClick={onAddParticipant}
        >
          새로운 인원 추가하기
        </Button>
      </section>
    );
  }

  private renderScheduleSection(dateLabel: string) {
    const { onEditSchedule } = this.props;
    const { scheduleDraft } = this.state;

    const human = scheduleDraft
      ? new Date(scheduleDraft).toLocaleDateString("ko-KR", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : "날짜 미정";

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
              onClick={onEditSchedule}
            >
              수정
            </Button>
          }
        />
        <div
          className={`${styles.inputLike} ${styles.staticField}`}
          aria-label="약속 날짜"
        >
          {human}
        </div>
      </section>
    );
  }

  private renderPlaceSection(placeLabel: string) {
    const { onEditPlace } = this.props;
    const { placeDraft } = this.state;

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
              onClick={onEditPlace}
            >
              수정
            </Button>
          }
        />
        <div
          className={`${styles.inputLike} ${styles.staticField}`}
          aria-label="약속 장소"
        >
          {placeDraft || "장소 미정"}
        </div>
      </section>
    );
  }

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
              onClick={onEditCourse}
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
    const { onCalculate } = this.props;
    return (
      <Button
        variant="primary"
        size="sm"
        style={{ width: "95%", justifySelf: "center" }}
        onClick={onCalculate}
      >
        일정, 장소, 코스 계산하기
      </Button>
    );
  }

  private renderFinalSaveButton() {
    const { onSave } = this.props;
    return (
      <Button
        variant="primary"
        size="lg"
        style={{ width: "97%", justifySelf: "center" }}
        onClick={onSave}
      >
        저장하기
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
        {this.renderTitleSection(data.title)}
        {this.renderParticipantsSection(data.participants)}
        <section className={styles.section}>
          <SectionHeader icon={<ResultIcon />} title="결과" size="md" />
          <div className={styles.sectionInner}>
            {this.renderScheduleSection(dateLabel)}
            {this.renderPlaceSection(placeLabel)}
            {this.renderCourseSection(data.course)}
            {this.renderCalculateButton()}
            {this.renderFinalSaveButton()}
          </div>
        </section>
        <div className={styles.bottomSpacer} />
      </div>
    );
  }
}
