// type RubricScore = {
//     rubric: string;
//     score: number;

// }

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
  rubric_scores?: string;
  improved_text?: string;
};

export type { WritingPreview, Writing };
