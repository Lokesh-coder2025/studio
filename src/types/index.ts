export interface Invigilator {
  id: string;
  name: string;
  designation: string;
}

export interface Examination {
  id: string;
  date: string;
  day: string;
  subject: string;
  startTime: string;
  endTime: string;
}

export interface Assignment {
  date: string;
  subject: string;
  time: string;
  invigilators: string[];
}

export interface SavedAllotment {
  id: string;
  examTitle: string;
  firstExamDate: string;
  invigilators: Invigilator[];
  examinations: Examination[];
  assignments: Assignment[];
}
