interface CriterionScore {
  criterion: string;
  score: number;
  reason: string;
}

interface WritingCriteriaDimension {
  dimension: string;
  criteria: CriterionScore[];
}

type WritingPreview = {
  _id: string;
  title: string;
  text: string;
  date: Date;
  overall_score: number;
};

type Writing = WritingPreview & {
  genre: string;
  subjects?: string[];
  feedback_student?: string;
  feedback_parent?: string;
  rubric_scores?: WritingCriteriaDimension[];
  improved_text?: string;
};

export type { WritingPreview, Writing, CriterionScore, WritingCriteriaDimension };
