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
  rooms: number;
  invigilators: number;
  relievers: number;
}

export interface Assignment {
  date: string;
  subject: string;
  time: string;
  invigilators: string[];
}
