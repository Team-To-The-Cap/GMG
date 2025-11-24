// src/pages/promise-main/index.view.tsx
// @ts-nocheck
import React from "react";
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
import type { PromiseDetail } from "@/types/promise";
import type { Participant } from "@/types/participant"; // ⬅️ 여기서 가져오기
import CourseSummaryCard from "@/components/ui/course-summary-card";
import CourseDetailList from "@/components/ui/course-detail-list";

type Props = {
  loading: boolean;
  error?: string;
  data?: PromiseDetail;

  onEditSchedule?: () => void;
  onEditPlace?: () => void;
  onEditCourse?: () => void;
  onAddParticipant?: () => void;

  onChangeTitle?: (value: string) => void;

  onChangeScheduleDate?: (valueISO: string) => void;
  onChangePlaceName?: (value: string) => void;

  onRemoveParticipant?: (id: string) => void;
  onEditParticipant?: (participant: Participant) => void; // ⬅️ 추가

  onCalculatePlan?: () => void;
  onCalculateCourse?: () => void;
  onSave?: () => void;

  saving?: boolean;
  calculatingPlan?: boolean;
  calculatingCourse?: boolean;

  isDraft?: boolean;
  onReset?: () => void;
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

export default class PromiseMainView extends React.PureComponent<Props, State> {
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

  // ===== 제목 =====
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

  // ===== 일정 =====
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

  // ===== 장소 =====
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

  // ===== 공통 섹션들 =====
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

  private renderTitleSection() {
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
    const { onAddParticipant, onRemoveParticipant, onEditParticipant } =
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
                    onRemoveParticipant?.(String(p.id));
                  }}
                >
                  ×
                </button>
              </div>
              <span className={styles.participantItemName}>{p.name}</span>

              {/* ⬇️ 수정 버튼 */}
              <button
                type="button"
                className={styles.editParticipantBtn}
                onClick={(e) => {
                  e.stopPropagation();
                  onEditParticipant?.(p);
                }}
              >
                수정
              </button>
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

  private renderScheduleSection() {
    const { onEditSchedule, data } = this.props;
    const { scheduleDraft } = this.state;

    // 🔎 백엔드에서 계산해준 plan 안의 available_dates 길이 확인
    const plan: any = (data as any)?.plan;
    const availableDates: any[] = Array.isArray(plan?.available_dates)
      ? plan.available_dates
      : [];

    const hasParticipants =
      Array.isArray(data?.participants) && data.participants.length > 0;

    let human: string;

    if (scheduleDraft) {
      // ✅ 사용자가 최종 날짜를 선택해서 저장한 경우
      human = new Date(scheduleDraft).toLocaleDateString("ko-KR", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } else if (plan && hasParticipants && availableDates.length === 0) {
      // ✅ plan은 존재하고, 참가자도 있는데 공통 가능한 날짜가 하나도 없을 때
      human = "모두가 함께 가능한 날짜가 없어요";
    } else {
      // ✅ 아직 자동 계산을 안 했거나, 데이터가 거의 없는 상태
      human = "날짜 미정";
    }

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

  private renderPlaceSection() {
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

  private renderPlanCalculateButton() {
    const { onCalculatePlan, calculatingPlan } = this.props;

    return (
      <Button
        variant="primary"
        size="sm"
        style={{ width: "95%", justifySelf: "center", marginTop: 8 }}
        onClick={onCalculatePlan}
        disabled={calculatingPlan}
      >
        {calculatingPlan ? "일정/장소 계산 중..." : "일정/장소 계산하기"}
      </Button>
    );
  }

  private renderCourseCalculateButton() {
    const { onCalculateCourse, calculatingCourse } = this.props;

    return (
      <Button
        variant="primary"
        size="sm"
        style={{ width: "95%", justifySelf: "center", marginTop: 8 }}
        onClick={onCalculateCourse}
        disabled={calculatingCourse}
      >
        {calculatingCourse ? "코스 계산 중..." : "코스 계산하기"}
      </Button>
    );
  }

  private renderFinalSaveArea() {
    const { onSave, saving, isDraft, onReset } = this.props;

    // ✅ onReset이 넘어오면: 두 개 버튼 (초기화 + 저장)
    if (onReset) {
      return (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr", // 두 버튼 같은 너비
            gap: 8,
            width: "100%",
          }}
        >
          <Button
            variant="ghost"
            size="lg"
            style={{ width: "100%" }}
            onClick={onReset}
            disabled={saving}
          >
            초기화
          </Button>
          <Button
            variant="primary"
            size="lg"
            style={{ width: "100%" }}
            onClick={onSave}
            disabled={saving}
          >
            {saving ? "저장 중..." : "저장하기"}
          </Button>
        </div>
      );
    }

    // ✅ onReset 없으면: 저장 버튼만
    return (
      <Button
        variant="primary"
        size="lg"
        style={{ width: "97%", justifySelf: "center" }}
        onClick={onSave}
        disabled={saving}
      >
        {saving ? "저장 중..." : "저장하기"}
      </Button>
    );
  }

  render() {
    const { loading, error, data } = this.props;

    if (loading) return this.renderSkeleton();
    if (error) return this.renderError(error);
    if (!data) return this.renderError("데이터가 없습니다.");

    return (
      <div className={styles.container}>
        {this.renderTitleSection()}
        {this.renderParticipantsSection(data.participants)}
        <section className={styles.section}>
          <SectionHeader icon={<ResultIcon />} title="결과" size="md" />
          <div className={styles.sectionInner}>
            {this.renderScheduleSection()}
            {this.renderPlaceSection()}
            {this.renderPlanCalculateButton()}
            {this.renderCourseSection(data.course)}
            {this.renderCourseCalculateButton()}
            {this.renderFinalSaveArea()}
          </div>
        </section>
        <div className={styles.bottomSpacer} />
      </div>
    );
  }
}
