export interface Invigilator {
  id: string;
  name: string;
  designation: string;
}

export interface Examination {
  id: string;
  date: Date;
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
