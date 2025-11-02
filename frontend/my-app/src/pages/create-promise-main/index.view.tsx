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

  /** 제목 변경을 외부로 전달(선택) */
  onChangeTitle?: (value: string) => void;
  onEditTitle?: () => void;

  /** ✅ 추가: 날짜/장소 변경 외부 전달(선택) */
  onChangeScheduleDate?: (valueISO: string) => void; // "YYYY-MM-DD" 형태 권장
  onChangePlaceName?: (value: string) => void;

  onRemoveParticipant?: (id: string) => void;
};

type State = {
  titleDraft: string; // 로컬 제목 입력값
  scheduleDraft: string; // "YYYY-MM-DD" (input[type=date] 값)
  placeDraft: string; // 장소 텍스트
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

/** ISO(또는 Date 호환 문자열) → "YYYY-MM-DD" */
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

  // props.data가 바뀌면 드래프트 동기화
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

  // ----- Title -----
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
      this.setState({ titleDraft: this.props.data?.title ?? "" }, () => {
        (e.target as HTMLInputElement).blur();
      });
    }
  };

  // ----- Schedule (date) -----
  private commitSchedule = () => {
    const { onChangeScheduleDate } = this.props;
    const value = this.state.scheduleDraft; // "YYYY-MM-DD"
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
    if (e.key === "Enter") {
      (e.target as HTMLInputElement).blur();
    } else if (e.key === "Escape") {
      this.setState(
        { scheduleDraft: toYMD(this.props.data?.schedule?.dateISO) },
        () => (e.target as HTMLInputElement).blur()
      );
    }
  };

  // ----- Place (text) -----
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
    if (e.key === "Enter") {
      (e.target as HTMLInputElement).blur();
    } else if (e.key === "Escape") {
      this.setState({ placeDraft: this.props.data?.place?.name ?? "" }, () => {
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
          //   action={
          //     <Button
          //       variant="ghost"
          //       size="xs"
          //       iconLeft={<EditIcon width={16} height={16} />}
          //       onClick={onEditTitle}
          //     >
          //       저장
          //     </Button>
          //   }
        />
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

  // ✅ 참석자 섹션 (삭제 버튼 유지)
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
          style={{ width: "97%", display: "block", margin: "0 auto" }}
          onClick={onAddParticipant}
        >
          새로운 인원 추가하기
        </Button>
      </section>
    );
  }

  // ✅ 일정 섹션: input[type="date"]로 수정 가능
  private renderScheduleSection(dateLabel: string) {
    const { onEditSchedule } = this.props;
    const { scheduleDraft } = this.state;

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
        <input
          type="date"
          className={`${styles.inputLike} ${styles.inputReset}`}
          value={scheduleDraft}
          onChange={this.handleScheduleChange}
          onBlur={this.handleScheduleBlur}
          onKeyDown={this.handleScheduleKeyDown}
          aria-label="약속 날짜"
        />
      </section>
    );
  }

  // ✅ 장소 섹션: 텍스트 입력으로 수정 가능
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
        <input
          type="text"
          className={`${styles.inputLike} ${styles.inputReset}`}
          placeholder="장소를 입력하세요"
          value={placeDraft}
          onChange={this.handlePlaceChange}
          onBlur={this.handlePlaceBlur}
          onKeyDown={this.handlePlaceKeyDown}
          aria-label="약속 장소"
        />
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

    // label은 더 이상 필요 없지만, 다른 곳에서 쓸 수 있으니 남겨둠
    const dateLabel = new Date(data.schedule.dateISO).toLocaleDateString(
      "ko-KR",
      { year: "numeric", month: "long", day: "numeric" }
    );
    const placeLabel = data.place?.name ?? "장소 미정";

    return (
      <div className={styles.container}>
        <TopBar title={`새로운 약속 추가`} />
        {/* {this.renderHeroCard(data.title, data.dday, data.participants ?? [])} */}
        {this.renderTitleSection(data.title)} {/* ✅ 제목 입력 */}
        {this.renderParticipantsSection(data.participants)} {/* 참석자 섹션 */}
        {/* 결과 블록 */}
        <section className={styles.section}>
          <SectionHeader icon={<ResultIcon />} title="결과" size="md" />
          <div className={styles.sectionInner}>
            {this.renderScheduleSection(dateLabel)} {/* ✅ 날짜 입력 */}
            {this.renderPlaceSection(placeLabel)} {/* ✅ 장소 입력 */}
            {this.renderCourseSection(data.course)} {/* 코스 */}
            {this.renderCalculateButton()}
          </div>
        </section>
        <div className={styles.bottomSpacer} />
      </div>
    );
  }
}
