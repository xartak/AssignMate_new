export type Course = {
  id: number;
  author: number;
  title: string;
  description: string;
};

export type Lesson = {
  id: number;
  order: number;
  title: string;
  description: string;
  materials?: string | null;
  duration: number | null;
};

export type Homework = {
  id: number;
  order: number;
  title: string;
  description: string;
  type: string;
  max_score: number;
  deadline?: string | null;
  details: unknown;
};

export type DashboardCourse = {
  id: number;
  title: string;
  students_count: number;
};

export type CourseStats = {
  id: number;
  title: string;
  students_count: number;
  lessons_count: number;
  homeworks_count: number;
  total_max_score: number;
};

export type CourseStudentStats = {
  student_id: number;
  email: string;
  first_name: string;
  last_name: string;
  submissions_count: number;
  reviewed_count: number;
  score_sum: number;
  completion_percent_score: number;
  completion_percent_submissions: number;
  last_submission_at: string | null;
};

export type CourseStudentHomework = {
  homework_id: number;
  lesson_order: number;
  lesson_title: string;
  title: string;
  deadline: string | null;
  status: string;
  score: number | null;
};

export type CourseStudentDetail = {
  course_id: number;
  course_title: string;
  student_id: number;
  email: string;
  first_name: string;
  last_name: string;
  homeworks_count: number;
  total_max_score: number;
  submissions_count: number;
  score_sum: number;
  on_time_count: number;
  homeworks: CourseStudentHomework[];
};
