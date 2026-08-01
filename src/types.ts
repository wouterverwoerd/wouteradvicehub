export interface User {
  id: number;
  title: string;
  firstName: string;
  lastName: string;
  email: string;
  role: 'Admin' | 'User';
  passwordHash?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface UserInput {
  title: string;
  firstName: string;
  lastName: string;
  email: string;
  role: 'Admin' | 'User';
  password?: string;
  confirmPassword?: string;
}

export interface Advice {
  id: number;
  content: string;
  userid: string;
  touserid: string;
  filename: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AdviceInput {
  content: string;
  userid: string;
  touserid: string;
  filename: string;
}

export interface AppEvent {
  id: number;
  description: string;
  userid: number | string;
  adviceid: number | string;
  eventDate: string;
  eventFilename: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AppEventInput {
  description: string;
  userid: number | string;
  adviceid: number | string;
  eventDate: string;
  eventFilename: string;
}

export interface CombinedEventDetail {
  eventID: number;
  eventDescription: string;
  eventDate: string;
  eventFilename: string;
  userid?: number | string;
}

export interface CombinedAdviceEvent {
  adviceID: number;
  adviceDescription: string;
  adviceFilename: string;
  userid?: string;
  touserid?: string;
  Events: CombinedEventDetail[];
}

export interface Idea {
  id: number;
  description: string;
  ideaDate: string;
  ideaFilename: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface IdeaInput {
  description: string;
  ideaDate: string;
  ideaFilename: string;
}

export interface Job {
  id: number;
  jobTitle: string;
  advertDate: string;
  company: string;
  url: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface JobInput {
  jobTitle: string;
  advertDate: string;
  company: string;
  url: string;
}
