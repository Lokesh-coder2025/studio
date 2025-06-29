export interface Invigilator {
  id: string;
  name: string;
  designation: string;
}

export interface Examination {
  id: number;
  date?: Date;
  day: string;
  subject: string;
  timings: string;
}

export interface Assignment {
  date: string;
  subject: string;
  time: string;
  invigilators: string[];
}
