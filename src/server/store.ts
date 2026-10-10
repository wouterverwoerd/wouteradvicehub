import bcrypt from 'bcryptjs';
import { User, Advice, AppEvent, Idea, Job, CombinedAdviceEvent } from '../types.js';
import {
  sequelize,
  UserModel,
  AdviceModel,
  EventModel,
  IdeaModel,
  JobModel,
  initMySqlConnection,
  isMySqlConnected,
} from './db/sequelize.js';

// Uniqueness and Deduplication Helpers
export function normalizeStr(str?: string | null): string {
  if (!str) return '';
  return str.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function normalizeJobUrl(url?: string | null): string {
  if (!url) return '';
  const trimmed = url.trim().toLowerCase().replace(/\/$/, '');
  if (trimmed === '#' || trimmed === 'https://' || trimmed === 'http://') return '';
  try {
    const u = new URL(trimmed);
    u.hash = '';
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'ref', 'source'].forEach((p) => {
      u.searchParams.delete(p);
    });
    return u.toString().replace(/\/$/, '');
  } catch {
    return trimmed;
  }
}

export function isJobDuplicate(a: any, b: any): boolean {
  if (!a || !b) return false;

  const urlA = normalizeJobUrl(a.url);
  const urlB = normalizeJobUrl(b.url);
  if (urlA && urlB && urlA === urlB) {
    return true;
  }

  const titleA = normalizeStr(a.jobTitle || a.title);
  const titleB = normalizeStr(b.jobTitle || b.title);
  const compA = normalizeStr(a.company);
  const compB = normalizeStr(b.company);

  if (titleA && titleB && compA && compB && titleA === titleB && compA === compB) {
    const areaA = normalizeStr(a.area || a.location);
    const areaB = normalizeStr(b.area || b.location);

    const isGenericA = !areaA || areaA.includes('remote') || areaA.includes('global');
    const isGenericB = !areaB || areaB.includes('remote') || areaB.includes('global');

    if (isGenericA || isGenericB || areaA === areaB || areaA.includes(areaB) || areaB.includes(areaA)) {
      return true;
    }

    const cities = ['christchurch', 'auckland', 'wellington', 'hamilton', 'tauranga', 'dunedin', 'canterbury', 'burnham', 'burnside'];
    const cityA = cities.find((c) => areaA.includes(c));
    const cityB = cities.find((c) => areaB.includes(c));
    if (cityA && cityB && cityA === cityB) {
      return true;
    }
    if (cityA && cityB && cityA !== cityB) {
      return false;
    }
    return true;
  }

  return false;
}

class DataStore {
  private usersMemory: User[] = [];
  private advicesMemory: Advice[] = [];
  private eventsMemory: AppEvent[] = [];
  private ideasMemory: Idea[] = [];
  private jobsMemory: Job[] = [];

  private userIdCounter = 1;
  private adviceIdCounter = 1;
  private eventIdCounter = 1;
  private ideaIdCounter = 1;
  private jobIdCounter = 1;

  constructor() {
    this.seedInitialMemoryData();
    // Attempt background MySQL connection sync
    initMySqlConnection().then((connected) => {
      if (connected) {
        this.seedInitialMySqlData();
      }
    });
  }

  private async seedInitialMemoryData() {
    const defaultPasswordHash = await bcrypt.hash('password123', 10);

    this.usersMemory = [
      {
        id: 1,
        title: 'Dr.',
        firstName: 'Wouter',
        lastName: 'Verwoerd',
        email: 'wouter.verwoerd@gmail.com',
        role: 'Admin',
        passwordHash: defaultPasswordHash,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 2,
        title: 'Ms.',
        firstName: 'Sarah',
        lastName: 'Connor',
        email: 'sarah.connor@example.com',
        role: 'User',
        passwordHash: defaultPasswordHash,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 3,
        title: 'Mr.',
        firstName: 'Alex',
        lastName: 'Mercer',
        email: 'alex.mercer@example.com',
        role: 'User',
        passwordHash: defaultPasswordHash,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
    this.userIdCounter = 4;

    this.advicesMemory = [
      {
        id: 1,
        content: 'Ensure database connections use secure SSL certificates and connection pooling for optimal throughput.',
        userid: '1',
        touserid: '2',
        filename: 'db_security_guide.pdf',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 2,
        content: 'Refactor API routing layer to handle asynchronous errors smoothly with central error middleware.',
        userid: '1',
        touserid: '3',
        filename: 'express_architecture.docx',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 3,
        content: 'Review event tracking schemas before publishing the next combined analytics release.',
        userid: '2',
        touserid: '1',
        filename: 'schema_review_notes.txt',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
    this.adviceIdCounter = 4;

    this.eventsMemory = [
      {
        id: 1,
        description: 'Initial setup of MySQL SSL certificates and connection strings.',
        userid: 1,
        adviceid: 1,
        eventDate: '2026-07-20',
        eventFilename: 'ssl_cert_deploy.log',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 2,
        description: 'Performance benchmark on Sequelize query sync.',
        userid: 1,
        adviceid: 1,
        eventDate: '2026-07-22',
        eventFilename: 'benchmark_report.csv',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 3,
        description: 'Express router middleware refactoring sprint completed.',
        userid: 3,
        adviceid: 2,
        eventDate: '2026-07-25',
        eventFilename: 'sprint_summary.pdf',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
    this.eventIdCounter = 4;

    this.ideasMemory = [
      {
        id: 1,
        description: 'Implement automated combined event views with inner join aggregation for quick client inspection.',
        ideaDate: '2026-07-28',
        ideaFilename: 'combined_events_proposal.pdf',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 2,
        description: 'Add JWT token authentication and role-based route middleware for protected endpoints.',
        ideaDate: '2026-07-30',
        ideaFilename: 'auth_roadmap.png',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
    this.ideaIdCounter = 3;

    this.jobsMemory = [
      {
        id: 1,
        jobTitle: 'Senior Full Stack Engineer (Node.js & React)',
        advertDate: '2026-08-01 10:00:00',
        company: 'AdviceTech NZ',
        url: 'https://careers.advicetech.co.nz/jobs/101',
        area: 'Auckland CBD, New Zealand',
        salary: '$135,000 - $160,000 per annum',
        employmentType: 'Full-time, Permanent',
        employment_type: 'Full-time, Permanent',
        highlights: ['Node.js & React stack', 'KiwiSaver contribution', 'Flexible remote-friendly work'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 2,
        jobTitle: 'Cloud & DevOps Architect',
        advertDate: '2026-07-29 14:30:00',
        company: 'Digital Government Services',
        url: 'https://govt.nz/careers/cloud-architect',
        area: 'Wellington Central, New Zealand',
        salary: '$150,000 - $175,000 per annum',
        employmentType: 'Permanent, Full-time',
        employment_type: 'Permanent, Full-time',
        highlights: ['AWS & GCP multi-cloud infrastructure', 'Public sector digital transformation', 'Great work-life balance'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 3,
        jobTitle: 'Data Platform Engineer',
        advertDate: '2026-08-03 09:15:00',
        company: 'Canterbury Tech Systems',
        url: 'https://canterburytech.nz/jobs/data-eng',
        area: 'Christchurch Central, New Zealand',
        salary: '$125,000 - $145,000 per annum',
        employmentType: 'Full-time',
        employment_type: 'Full-time',
        highlights: ['Kafka & Snowflake data pipelines', 'Christchurch tech hub location', 'Professional development budget'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 4,
        jobTitle: 'Lead Software Developer',
        advertDate: '2026-08-05 11:00:00',
        company: 'Waikato Innovation Hub',
        url: 'https://waikatohub.co.nz/careers/lead-dev',
        area: 'Frankton, Hamilton, New Zealand',
        salary: '$130,000 - $155,000 per annum',
        employmentType: 'Full-time',
        employment_type: 'Full-time',
        highlights: ['Agile engineering leadership', 'Modern TypeScript & microservices', 'Health insurance allowance'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 5,
        jobTitle: 'Senior Mobile & Web Developer',
        advertDate: '2026-08-06 08:45:00',
        company: 'Southern Lakes Digital',
        url: 'https://southernlakesdigital.co.nz/jobs/mobile',
        area: 'Queenstown Central, New Zealand',
        salary: '$120,000 - $140,000 per annum',
        employmentType: 'Permanent, Full-time',
        employment_type: 'Permanent, Full-time',
        highlights: ['React Native & Web Apps', 'Scenic Queenstown office', 'Ski pass subsidy'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 6,
        jobTitle: 'Engineer Research Software',
        advertDate: '2026-08-07 09:00:00',
        company: 'University of Otago',
        url: '#',
        area: 'Christchurch Central, Canterbury',
        salary: '$99,364 to $120,834 per year',
        employmentType: 'Full-time, Academic',
        employment_type: 'Full-time, Academic',
        highlights: [
          'Salary + 6.75% Superannuation + 5 weeks annual leave',
          'On-going professional development opportunities',
          'Great people and a collaborative culture',
          'Strong applicant',
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 7,
        jobTitle: 'Software Engineer',
        advertDate: '2026-08-07 10:15:00',
        company: 'Talent Army – Winner of Medium Recruitment Agency of the Year 2025',
        url: '#',
        area: 'Christchurch Central, Canterbury',
        salary: null,
        employmentType: 'Office-based role',
        employment_type: 'Office-based role',
        highlights: [
          'Build scalable software used by customers around the world',
          'Join a collaborative, high-trust engineering culture',
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 8,
        jobTitle: 'CONTRACT Senior iOS Mobile Apps Developer (Swift)',
        advertDate: '2026-08-07 11:30:00',
        company: 'Sunstone Talent',
        url: '#',
        area: 'Christchurch, Canterbury',
        salary: '$100-$130 p/h',
        employmentType: 'Contract (9 month contract)',
        employment_type: 'Contract (9 month contract)',
        highlights: [
          'Hybrid + Parking',
          'Work at a great product company',
          'Passionate about Apple mobile development? Enjoy building mobile apps?',
          'Come join a great team working on a client project',
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 9,
        jobTitle: 'Service Desk Analyst',
        advertDate: '2026-08-07 13:00:00',
        company: 'Softsource Ltd',
        url: '#',
        area: 'Christchurch Central, Canterbury',
        salary: null,
        employmentType: 'Full-time',
        employment_type: 'Full-time',
        highlights: ['Recently posted'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 10,
        jobTitle: 'Data and Reporting Administrator',
        advertDate: '2026-08-07 14:15:00',
        company: 'ScreenSouth Ltd',
        url: '#',
        area: 'Christchurch Central, Canterbury',
        salary: '$37 – $42 per hour',
        employmentType: 'Contract / Casual',
        employment_type: 'Contract / Casual',
        highlights: ['Hybrid'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 11,
        jobTitle: 'IT Systems Administrator',
        advertDate: '2026-08-07 15:30:00',
        company: 'Kea Aerospace',
        url: '#',
        area: 'Burnside, Canterbury',
        salary: null,
        employmentType: 'Full-time or part-time considered',
        employment_type: 'Full-time or part-time considered',
        highlights: [
          'Hands-on across servers, networking, security and DR',
          'Direct line to engineering, no layers of IT management',
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 12,
        jobTitle: 'Engineer',
        advertDate: '2026-08-07 16:00:00',
        company: 'New Zealand Defence Force | Te Ope Katua o Aotearoa',
        url: '#',
        area: 'Burnham, Canterbury',
        salary: '$97,344 - $112,555 (including 4% superannuation)',
        employmentType: 'Permanent, Full-time',
        employment_type: 'Permanent, Full-time',
        highlights: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 13,
        jobTitle: 'MADCAP - Test Automation Engineer',
        advertDate: '2026-08-08 09:30:00',
        company: 'Jade Software Corporation Ltd',
        url: '#',
        area: 'Christchurch Central, Canterbury',
        salary: null,
        employmentType: 'Full-time',
        employment_type: 'Full-time',
        highlights: [
          'Join Jade and help shape software used around the world',
          'Grow your career in test automation and quality engineering',
          'Shape the software powering the global dairy manufacturing industry',
          'Recently posted',
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 14,
        jobTitle: 'OPERA Cloud Specialist',
        advertDate: '2026-08-08 10:45:00',
        company: 'Scenic Hotel Group',
        url: '#',
        area: 'Burnside, Canterbury',
        salary: null,
        employmentType: 'Full-time',
        employment_type: 'Full-time',
        highlights: [
          'Newly created specialist role with genuine influence across our hotel network',
          'Help lead the configuration and rollout of Oracle OPERA Cloud',
          'Combine your technology expertise with your understanding of hotel operations',
          'Recently posted',
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 15,
        jobTitle: 'Automation Engineer',
        advertDate: '2026-08-08 11:20:00',
        company: 'Fluid Engineering',
        url: '#',
        area: 'Christchurch, Canterbury',
        salary: '$110k - $140k p.a. + insurances + paid overtime',
        employmentType: 'Full-time',
        employment_type: 'Full-time',
        highlights: [
          'Work on projects that few others in NZ get exposure to',
          'Immerse yourself in exciting industries like aerospace',
          'Excellent salary, flexible working and genuine career progression',
          'Recently posted',
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 16,
        jobTitle: 'Senior Applications Specialist',
        advertDate: '2026-08-08 12:00:00',
        company: 'Pacific Radiology',
        url: '#',
        area: 'Christchurch Central, Canterbury',
        salary: 'Competitive Salary',
        employmentType: 'Permanent, Full-time',
        employment_type: 'Permanent, Full-time',
        highlights: [
          'Located in Christchurch or Tauranga',
          'Hybrid',
          '5 Weeks Annual Leave + Health Insurance + EAP + CPD Leave',
          'Be the senior technical authority for assigned clinical and business apps',
          'Recently posted',
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
    this.jobIdCounter = 17;
  }

  private async seedInitialMySqlData() {
    try {
      const count = await UserModel.count();
      if (count === 0) {
        console.log('[MySQL] Seeding initial data into MySQL tables...');
        const defaultHash = await bcrypt.hash('password123', 10);
        await UserModel.bulkCreate([
          { title: 'Dr.', firstName: 'Wouter', lastName: 'Verwoerd', email: 'wouter.verwoerd@gmail.com', role: 'Admin', passwordHash: defaultHash },
          { title: 'Ms.', firstName: 'Sarah', lastName: 'Connor', email: 'sarah.connor@example.com', role: 'User', passwordHash: defaultHash },
          { title: 'Mr.', firstName: 'Alex', lastName: 'Mercer', email: 'alex.mercer@example.com', role: 'User', passwordHash: defaultHash },
        ]);

        await AdviceModel.bulkCreate([
          { content: 'Ensure database connections use secure SSL certificates and connection pooling for optimal throughput.', userid: '1', touserid: '2', filename: 'db_security_guide.pdf' },
          { content: 'Refactor API routing layer to handle asynchronous errors smoothly with central error middleware.', userid: '1', touserid: '3', filename: 'express_architecture.docx' },
          { content: 'Review event tracking schemas before publishing the next combined analytics release.', userid: '2', touserid: '1', filename: 'schema_review_notes.txt' },
        ]);

        await EventModel.bulkCreate([
          { description: 'Initial setup of MySQL SSL certificates and connection strings.', userid: 1, adviceid: 1, eventDate: '2026-07-20', eventFilename: 'ssl_cert_deploy.log' },
          { description: 'Performance benchmark on Sequelize query sync.', userid: 1, adviceid: 1, eventDate: '2026-07-22', eventFilename: 'benchmark_report.csv' },
          { description: 'Express router middleware refactoring sprint completed.', userid: 3, adviceid: 2, eventDate: '2026-07-25', eventFilename: 'sprint_summary.pdf' },
        ]);

        await IdeaModel.bulkCreate([
          { description: 'Implement automated combined event views with inner join aggregation for quick client inspection.', ideaDate: '2026-07-28', ideaFilename: 'combined_events_proposal.pdf' },
          { description: 'Add JWT token authentication and role-based route middleware for protected endpoints.', ideaDate: '2026-07-30', ideaFilename: 'auth_roadmap.png' },
        ]);

        await JobModel.bulkCreate([
          { jobTitle: 'Senior Full Stack Engineer (Node.js & React)', advertDate: '2026-08-01 10:00:00', company: 'AdviceTech NZ', url: 'https://careers.advicetech.co.nz/jobs/101', area: 'Auckland CBD, New Zealand', salary: '$135,000 - $160,000 per annum', employmentType: 'Full-time, Permanent' },
          { jobTitle: 'Cloud & DevOps Architect', advertDate: '2026-07-29 14:30:00', company: 'Digital Government Services', url: 'https://govt.nz/careers/cloud-architect', area: 'Wellington Central, New Zealand', salary: '$150,000 - $175,000 per annum', employmentType: 'Permanent, Full-time' },
          { jobTitle: 'Data Platform Engineer', advertDate: '2026-08-03 09:15:00', company: 'Canterbury Tech Systems', url: 'https://canterburytech.nz/jobs/data-eng', area: 'Christchurch Central, New Zealand', salary: '$125,000 - $145,000 per annum', employmentType: 'Full-time' },
          { jobTitle: 'Lead Software Developer', advertDate: '2026-08-05 11:00:00', company: 'Waikato Innovation Hub', url: 'https://waikatohub.co.nz/careers/lead-dev', area: 'Frankton, Hamilton, New Zealand', salary: '$130,000 - $155,000 per annum', employmentType: 'Full-time' },
          { jobTitle: 'Senior Mobile & Web Developer', advertDate: '2026-08-06 08:45:00', company: 'Southern Lakes Digital', url: 'https://southernlakesdigital.co.nz/jobs/mobile', area: 'Queenstown Central, New Zealand', salary: '$120,000 - $140,000 per annum', employmentType: 'Permanent, Full-time' },
          { jobTitle: 'Engineer Research Software', advertDate: '2026-08-07 09:00:00', company: 'University of Otago', url: '#', area: 'Christchurch Central, Canterbury', salary: '$99,364 to $120,834 per year', employmentType: 'Full-time, Academic' },
          { jobTitle: 'Software Engineer', advertDate: '2026-08-07 10:15:00', company: 'Talent Army – Winner of Medium Recruitment Agency of the Year 2025', url: '#', area: 'Christchurch Central, Canterbury', salary: null, employmentType: 'Office-based role' },
          { jobTitle: 'CONTRACT Senior iOS Mobile Apps Developer (Swift)', advertDate: '2026-08-07 11:30:00', company: 'Sunstone Talent', url: '#', area: 'Christchurch, Canterbury', salary: '$100-$130 p/h', employmentType: 'Contract (9 month contract)' },
          { jobTitle: 'Service Desk Analyst', advertDate: '2026-08-07 13:00:00', company: 'Softsource Ltd', url: '#', area: 'Christchurch Central, Canterbury', salary: null, employmentType: 'Full-time' },
          { jobTitle: 'Data and Reporting Administrator', advertDate: '2026-08-07 14:15:00', company: 'ScreenSouth Ltd', url: '#', area: 'Christchurch Central, Canterbury', salary: '$37 – $42 per hour', employmentType: 'Contract / Casual' },
          { jobTitle: 'IT Systems Administrator', advertDate: '2026-08-07 15:30:00', company: 'Kea Aerospace', url: '#', area: 'Burnside, Canterbury', salary: null, employmentType: 'Full-time or part-time considered' },
          { jobTitle: 'Engineer', advertDate: '2026-08-07 16:00:00', company: 'New Zealand Defence Force | Te Ope Katua o Aotearoa', url: '#', area: 'Burnham, Canterbury', salary: '$97,344 - $112,555 (including 4% superannuation)', employmentType: 'Permanent, Full-time' },
          { jobTitle: 'MADCAP - Test Automation Engineer', advertDate: '2026-08-08 09:30:00', company: 'Jade Software Corporation Ltd', url: '#', area: 'Christchurch Central, Canterbury', salary: null, employmentType: 'Full-time' },
          { jobTitle: 'OPERA Cloud Specialist', advertDate: '2026-08-08 10:45:00', company: 'Scenic Hotel Group', url: '#', area: 'Burnside, Canterbury', salary: null, employmentType: 'Full-time' },
          { jobTitle: 'Automation Engineer', advertDate: '2026-08-08 11:20:00', company: 'Fluid Engineering', url: '#', area: 'Christchurch, Canterbury', salary: '$110k - $140k p.a. + insurances + paid overtime', employmentType: 'Full-time' },
          { jobTitle: 'Senior Applications Specialist', advertDate: '2026-08-08 12:00:00', company: 'Pacific Radiology', url: '#', area: 'Christchurch Central, Canterbury', salary: 'Competitive Salary', employmentType: 'Permanent, Full-time' },
        ]);
        console.log('[MySQL] Seeding complete.');
      }
    } catch (err: any) {
      console.error('[MySQL Seed Warning]', err.message);
    }
  }


  // --- Users ---
  async getAllUsers(): Promise<User[]> {
    if (isMySqlConnected) {
      const rows = await UserModel.findAll({ attributes: { exclude: ['passwordHash'] } });
      return rows.map((r) => r.toJSON() as User);
    }
    return this.usersMemory.map(({ passwordHash, ...u }) => u);
  }

  async getUserById(id: number): Promise<User | null> {
    if (isMySqlConnected) {
      const row = await UserModel.findByPk(id, { attributes: { exclude: ['passwordHash'] } });
      return row ? (row.toJSON() as User) : null;
    }
    const user = this.usersMemory.find((u) => u.id === id);
    if (!user) return null;
    const { passwordHash, ...safeUser } = user;
    return safeUser;
  }

  async createUser(params: any): Promise<User> {
    if (isMySqlConnected) {
      const existing = await UserModel.findOne({ where: { email: params.email } });
      if (existing) throw new Error(`Email "${params.email}" is already registered`);

      const passwordHash = await bcrypt.hash(params.password, 10);
      const created = await UserModel.create({
        title: params.title,
        firstName: params.firstName,
        lastName: params.lastName,
        email: params.email,
        role: params.role,
        passwordHash,
      });

      const safeUser = created.toJSON() as User;
      delete (safeUser as any).passwordHash;
      return safeUser;
    }

    if (this.usersMemory.some((u) => u.email === params.email)) {
      throw new Error(`Email "${params.email}" is already registered`);
    }

    const passwordHash = await bcrypt.hash(params.password, 10);
    const newUser: User = {
      id: this.userIdCounter++,
      title: params.title,
      firstName: params.firstName,
      lastName: params.lastName,
      email: params.email,
      role: params.role,
      passwordHash,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.usersMemory.push(newUser);
    const { passwordHash: _, ...safeUser } = newUser;
    return safeUser;
  }

  async updateUser(id: number, params: any): Promise<User> {
    if (isMySqlConnected) {
      const user = await UserModel.findByPk(id);
      if (!user) throw new Error('User not found');

      if (params.email && params.email !== user.get('email')) {
        const existing = await UserModel.findOne({ where: { email: params.email } });
        if (existing) throw new Error(`Email "${params.email}" is already registered`);
      }

      const updateData: any = {};
      if (params.password) updateData.passwordHash = await bcrypt.hash(params.password, 10);
      if (params.title) updateData.title = params.title;
      if (params.firstName) updateData.firstName = params.firstName;
      if (params.lastName) updateData.lastName = params.lastName;
      if (params.email) updateData.email = params.email;
      if (params.role) updateData.role = params.role;

      await user.update(updateData);
      const safeUser = user.toJSON() as User;
      delete (safeUser as any).passwordHash;
      return safeUser;
    }

    const index = this.usersMemory.findIndex((u) => u.id === id);
    if (index === -1) throw new Error('User not found');

    const user = this.usersMemory[index];
    if (params.email && params.email !== user.email) {
      if (this.usersMemory.some((u) => u.email === params.email)) {
        throw new Error(`Email "${params.email}" is already registered`);
      }
    }

    if (params.password) {
      user.passwordHash = await bcrypt.hash(params.password, 10);
    }

    if (params.title) user.title = params.title;
    if (params.firstName) user.firstName = params.firstName;
    if (params.lastName) user.lastName = params.lastName;
    if (params.email) user.email = params.email;
    if (params.role) user.role = params.role;
    user.updatedAt = new Date().toISOString();

    const { passwordHash: _, ...safeUser } = user;
    return safeUser;
  }

  async deleteUser(id: number): Promise<void> {
    if (isMySqlConnected) {
      const deleted = await UserModel.destroy({ where: { id } });
      if (!deleted) throw new Error('User not found');
      return;
    }

    const index = this.usersMemory.findIndex((u) => u.id === id);
    if (index === -1) throw new Error('User not found');
    this.usersMemory.splice(index, 1);
  }

  // --- Advices ---
  async getAllAdvices(): Promise<Advice[]> {
    if (isMySqlConnected) {
      const rows = await AdviceModel.findAll();
      return rows.map((r) => r.toJSON() as Advice);
    }
    return [...this.advicesMemory];
  }

  async getAdviceById(id: number): Promise<Advice | null> {
    if (isMySqlConnected) {
      const row = await AdviceModel.findByPk(id);
      return row ? (row.toJSON() as Advice) : null;
    }
    return this.advicesMemory.find((a) => a.id === id) || null;
  }

  async createAdvice(params: any): Promise<Advice> {
    if (isMySqlConnected) {
      const existing = await AdviceModel.findOne({ where: { content: params.content } });
      if (existing) throw new Error(`Content "${params.content}" is already registered`);

      const created = await AdviceModel.create({
        content: params.content,
        userid: String(params.userid),
        touserid: String(params.touserid),
        filename: params.filename,
      });

      return created.toJSON() as Advice;
    }

    if (this.advicesMemory.some((a) => a.content === params.content)) {
      throw new Error(`Content "${params.content}" is already registered`);
    }

    const newAdvice: Advice = {
      id: this.adviceIdCounter++,
      content: params.content,
      userid: String(params.userid),
      touserid: String(params.touserid),
      filename: params.filename,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.advicesMemory.push(newAdvice);
    return newAdvice;
  }

  async updateAdvice(id: number, params: any): Promise<Advice> {
    if (isMySqlConnected) {
      const advice = await AdviceModel.findByPk(id);
      if (!advice) throw new Error('Advice not found');

      if (params.content && params.content !== advice.get('content')) {
        const existing = await AdviceModel.findOne({ where: { content: params.content } });
        if (existing) throw new Error(`Content "${params.content}" is already registered`);
      }

      const updateData: any = {};
      if (params.content) updateData.content = params.content;
      if (params.touserid !== undefined) updateData.touserid = String(params.touserid);
      if (params.filename !== undefined) updateData.filename = params.filename;

      await advice.update(updateData);
      return advice.toJSON() as Advice;
    }

    const advice = this.advicesMemory.find((a) => a.id === id);
    if (!advice) throw new Error('Advice not found');

    if (params.content && params.content !== advice.content) {
      if (this.advicesMemory.some((a) => a.content === params.content)) {
        throw new Error(`Content "${params.content}" is already registered`);
      }
      advice.content = params.content;
    }

    if (params.touserid !== undefined) advice.touserid = String(params.touserid);
    if (params.filename !== undefined) advice.filename = params.filename;
    advice.updatedAt = new Date().toISOString();

    return advice;
  }

  async deleteAdvice(id: number): Promise<void> {
    if (isMySqlConnected) {
      const deleted = await AdviceModel.destroy({ where: { id } });
      if (!deleted) throw new Error('Advice not found');
      return;
    }

    const index = this.advicesMemory.findIndex((a) => a.id === id);
    if (index === -1) throw new Error('Advice not found');
    this.advicesMemory.splice(index, 1);
  }

  // --- Events ---
  async getAllEvents(): Promise<AppEvent[]> {
    if (isMySqlConnected) {
      const rows = await EventModel.findAll();
      return rows.map((r) => r.toJSON() as AppEvent);
    }
    return [...this.eventsMemory];
  }

  async getEventById(id: number): Promise<AppEvent | null> {
    if (isMySqlConnected) {
      const row = await EventModel.findByPk(id);
      return row ? (row.toJSON() as AppEvent) : null;
    }
    return this.eventsMemory.find((e) => e.id === id) || null;
  }

  async getCombinedEvents(): Promise<CombinedAdviceEvent[]> {
    if (isMySqlConnected) {
      const advices = await AdviceModel.findAll({
        include: [{ model: EventModel, as: 'Events' }],
      });

      return advices.map((adviceRow: any) => {
        const advice = adviceRow.toJSON();
        const relatedEvents = (advice.Events || []).map((e: any) => ({
          eventID: e.id,
          eventDescription: e.description,
          eventDate: e.eventDate,
          eventFilename: e.eventFilename,
          userid: e.userid,
        }));

        return {
          adviceID: advice.id,
          adviceDescription: advice.content,
          adviceFilename: advice.filename,
          userid: advice.userid,
          touserid: advice.touserid,
          Events: relatedEvents,
        };
      });
    }

    return this.advicesMemory.map((advice) => {
      const relatedEvents = this.eventsMemory
        .filter((e) => String(e.adviceid) === String(advice.id))
        .map((e) => ({
          eventID: e.id,
          eventDescription: e.description,
          eventDate: e.eventDate,
          eventFilename: e.eventFilename,
          userid: e.userid,
        }));

      return {
        adviceID: advice.id,
        adviceDescription: advice.content,
        adviceFilename: advice.filename,
        userid: advice.userid,
        touserid: advice.touserid,
        Events: relatedEvents,
      };
    });
  }

  async createEvent(params: any): Promise<AppEvent> {
    if (isMySqlConnected) {
      const created = await EventModel.create({
        description: params.description,
        userid: Number(params.userid),
        adviceid: Number(params.adviceid),
        eventDate: params.eventDate,
        eventFilename: params.eventFilename,
      });

      return created.toJSON() as AppEvent;
    }

    const newEvent: AppEvent = {
      id: this.eventIdCounter++,
      description: params.description,
      userid: params.userid,
      adviceid: params.adviceid,
      eventDate: params.eventDate,
      eventFilename: params.eventFilename,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.eventsMemory.push(newEvent);
    return newEvent;
  }

  async updateEvent(id: number, params: any): Promise<AppEvent> {
    if (isMySqlConnected) {
      const event = await EventModel.findByPk(id);
      if (!event) throw new Error('Event not found');

      const updateData: any = {};
      if (params.description) updateData.description = params.description;
      if (params.userid !== undefined) updateData.userid = Number(params.userid);
      if (params.adviceid !== undefined) updateData.adviceid = Number(params.adviceid);
      if (params.eventDate) updateData.eventDate = params.eventDate;
      if (params.eventFilename) updateData.eventFilename = params.eventFilename;

      await event.update(updateData);
      return event.toJSON() as AppEvent;
    }

    const event = this.eventsMemory.find((e) => e.id === id);
    if (!event) throw new Error('Event not found');

    if (params.description) event.description = params.description;
    if (params.userid !== undefined) event.userid = params.userid;
    if (params.adviceid !== undefined) event.adviceid = params.adviceid;
    if (params.eventDate) event.eventDate = params.eventDate;
    if (params.eventFilename) event.eventFilename = params.eventFilename;
    event.updatedAt = new Date().toISOString();

    return event;
  }

  async deleteEvent(id: number): Promise<void> {
    if (isMySqlConnected) {
      const deleted = await EventModel.destroy({ where: { id } });
      if (!deleted) throw new Error('Event not found');
      return;
    }

    const index = this.eventsMemory.findIndex((e) => e.id === id);
    if (index === -1) throw new Error('Event not found');
    this.eventsMemory.splice(index, 1);
  }

  // --- Ideas ---
  async getAllIdeas(): Promise<Idea[]> {
    if (isMySqlConnected) {
      const rows = await IdeaModel.findAll();
      return rows.map((r) => r.toJSON() as Idea);
    }
    return [...this.ideasMemory];
  }

  async getIdeaById(id: number): Promise<Idea | null> {
    if (isMySqlConnected) {
      const row = await IdeaModel.findByPk(id);
      return row ? (row.toJSON() as Idea) : null;
    }
    return this.ideasMemory.find((i) => i.id === id) || null;
  }

  async createIdea(params: any): Promise<Idea> {
    if (isMySqlConnected) {
      const existing = await IdeaModel.findOne({ where: { description: params.description } });
      if (existing) throw new Error(`Content "${params.description}" is already registered`);

      const created = await IdeaModel.create({
        description: params.description,
        ideaDate: params.ideaDate,
        ideaFilename: params.ideaFilename,
      });

      return created.toJSON() as Idea;
    }

    if (this.ideasMemory.some((i) => i.description === params.description)) {
      throw new Error(`Content "${params.description}" is already registered`);
    }

    const newIdea: Idea = {
      id: this.ideaIdCounter++,
      description: params.description,
      ideaDate: params.ideaDate,
      ideaFilename: params.ideaFilename,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.ideasMemory.push(newIdea);
    return newIdea;
  }

  async updateIdea(id: number, params: any): Promise<Idea> {
    if (isMySqlConnected) {
      const idea = await IdeaModel.findByPk(id);
      if (!idea) throw new Error('Idea not found');

      if (params.description && params.description !== idea.get('description')) {
        const existing = await IdeaModel.findOne({ where: { description: params.description } });
        if (existing) throw new Error(`Content "${params.description}" is already registered`);
      }

      const updateData: any = {};
      if (params.description) updateData.description = params.description;
      if (params.ideaDate) updateData.ideaDate = params.ideaDate;
      if (params.ideaFilename) updateData.ideaFilename = params.ideaFilename;

      await idea.update(updateData);
      return idea.toJSON() as Idea;
    }

    const idea = this.ideasMemory.find((i) => i.id === id);
    if (!idea) throw new Error('Idea not found');

    if (params.description && params.description !== idea.description) {
      if (this.ideasMemory.some((i) => i.description === params.description)) {
        throw new Error(`Content "${params.description}" is already registered`);
      }
      idea.description = params.description;
    }

    if (params.ideaDate) idea.ideaDate = params.ideaDate;
    if (params.ideaFilename) idea.ideaFilename = params.ideaFilename;
    idea.updatedAt = new Date().toISOString();

    return idea;
  }

  async deleteIdea(id: number): Promise<void> {
    if (isMySqlConnected) {
      const deleted = await IdeaModel.destroy({ where: { id } });
      if (!deleted) throw new Error('Idea not found');
      return;
    }

    const index = this.ideasMemory.findIndex((i) => i.id === id);
    if (index === -1) throw new Error('Idea not found');
    this.ideasMemory.splice(index, 1);
  }

  // --- Jobs ---
  async getAllJobs(): Promise<Job[]> {
    if (isMySqlConnected) {
      const rows = await JobModel.findAll();
      return rows.map((r) => r.toJSON() as Job);
    }
    return [...this.jobsMemory];
  }

  async getJobById(id: number): Promise<Job | null> {
    if (isMySqlConnected) {
      const row = await JobModel.findByPk(id);
      return row ? (row.toJSON() as Job) : null;
    }
    return this.jobsMemory.find((j) => j.id === id) || null;
  }

  async createJob(params: any): Promise<Job> {
    const jobTitle = params.jobTitle || params.title || 'Untitled Role';
    const company = params.company || 'Unknown Company';
    const rawArea = params.area || params.location || 'Remote / Global';
    const area = rawArea && rawArea.trim() ? rawArea.trim() : 'Remote / Global';
    const advertDate = params.advertDate || new Date().toISOString().slice(0, 19).replace('T', ' ');
    const url = params.url || '#';
    const salary = params.salary || null;
    const employmentType = params.employmentType || params.employment_type || null;
    const highlights = Array.isArray(params.highlights) ? params.highlights : (params.highlights ? [params.highlights] : null);

    if (isMySqlConnected) {
      const created = await JobModel.create({
        jobTitle,
        advertDate,
        company,
        url,
        area,
        salary,
        employmentType,
        highlights,
      });
      return created.toJSON() as Job;
    }

    const newJob: Job = {
      id: this.jobIdCounter++,
      jobTitle,
      advertDate,
      company,
      url,
      area,
      salary,
      employmentType,
      employment_type: employmentType,
      highlights,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.jobsMemory.push(newJob);
    return newJob;
  }

  async createJobsBulk(
    jobsList: any[],
    options: { deduplicate?: boolean; updateExisting?: boolean } = { deduplicate: true, updateExisting: false }
  ): Promise<{
    created: Job[];
    updated: Job[];
    skippedDuplicates: number;
    duplicateTitles: string[];
    totalProcessed: number;
  }> {
    const deduplicate = options?.deduplicate !== false;
    const updateExisting = options?.updateExisting === true;

    const existingJobs = await this.getAllJobs();
    const created: Job[] = [];
    const updated: Job[] = [];
    const duplicateTitles: string[] = [];
    let skippedDuplicates = 0;

    for (const item of jobsList) {
      if (!item || typeof item !== 'object') continue;

      const title = item.jobTitle || item.title;
      const company = item.company;
      if (!title && !company) continue;

      if (deduplicate) {
        // Check against both existing jobs in DB and newly created in this batch
        const match = existingJobs.find((existing) => isJobDuplicate(item, existing));

        if (match) {
          duplicateTitles.push(title || match.jobTitle);
          skippedDuplicates++;

          // If requested, enrich the existing record with new details
          if (updateExisting) {
            const updateData: any = {};
            let hasUpdates = false;

            if (!match.salary && item.salary) {
              updateData.salary = item.salary;
              hasUpdates = true;
            }
            if (!match.employmentType && (item.employmentType || item.employment_type)) {
              updateData.employmentType = item.employmentType || item.employment_type;
              hasUpdates = true;
            }
            if ((!match.highlights || match.highlights.length === 0) && item.highlights) {
              updateData.highlights = Array.isArray(item.highlights) ? item.highlights : [item.highlights];
              hasUpdates = true;
            }
            if ((!match.url || match.url === '#' || match.url === 'https://') && item.url && item.url !== '#') {
              updateData.url = item.url;
              hasUpdates = true;
            }

            if (hasUpdates) {
              const updatedJob = await this.updateJob(match.id, updateData);
              updated.push(updatedJob);
              Object.assign(match, updatedJob);
            }
          }
          continue;
        }
      }

      const newJob = await this.createJob(item);
      created.push(newJob);
      existingJobs.push(newJob);
    }

    return {
      created,
      updated,
      skippedDuplicates,
      duplicateTitles: [...new Set(duplicateTitles)],
      totalProcessed: jobsList.length,
    };
  }

  async deduplicateExistingJobs(): Promise<{
    removedCount: number;
    remainingCount: number;
    removedJobs: { id: number; title: string; company: string }[];
  }> {
    const allJobs = await this.getAllJobs();
    const seen: Job[] = [];
    const toDelete: Job[] = [];

    for (const job of allJobs) {
      const match = seen.find((s) => isJobDuplicate(s, job));
      if (match) {
        // Merge missing data into the retained record
        const updateData: any = {};
        let needsUpdate = false;
        if (!match.salary && job.salary) {
          updateData.salary = job.salary;
          needsUpdate = true;
        }
        if (!match.employmentType && (job.employmentType || job.employment_type)) {
          updateData.employmentType = job.employmentType || job.employment_type;
          needsUpdate = true;
        }
        if (
          (!match.highlights || match.highlights.length === 0) &&
          job.highlights &&
          job.highlights.length > 0
        ) {
          updateData.highlights = job.highlights;
          needsUpdate = true;
        }
        if ((!match.url || match.url === '#' || match.url === 'https://') && job.url && job.url !== '#') {
          updateData.url = job.url;
          needsUpdate = true;
        }
        if (needsUpdate) {
          await this.updateJob(match.id, updateData);
          Object.assign(match, updateData);
        }
        toDelete.push(job);
      } else {
        seen.push(job);
      }
    }

    for (const dup of toDelete) {
      await this.deleteJob(dup.id);
    }

    return {
      removedCount: toDelete.length,
      remainingCount: seen.length,
      removedJobs: toDelete.map((j) => ({ id: j.id, title: j.jobTitle, company: j.company })),
    };
  }

  async updateJob(id: number, params: any): Promise<Job> {
    const jobTitle = params.jobTitle || params.title;
    const area = params.area !== undefined ? params.area : params.location;
    const employmentType = params.employmentType !== undefined ? params.employmentType : params.employment_type;

    if (isMySqlConnected) {
      const job = await JobModel.findByPk(id);
      if (!job) throw new Error('Job advert not found');

      const updateData: any = {};
      if (jobTitle) updateData.jobTitle = jobTitle;
      if (params.advertDate) updateData.advertDate = params.advertDate;
      if (params.company) updateData.company = params.company;
      if (params.url) updateData.url = params.url;
      if (area !== undefined) updateData.area = area;
      if (params.salary !== undefined) updateData.salary = params.salary;
      if (employmentType !== undefined) updateData.employmentType = employmentType;
      if (params.highlights !== undefined) updateData.highlights = params.highlights;

      await job.update(updateData);
      return job.toJSON() as Job;
    }

    const job = this.jobsMemory.find((j) => j.id === id);
    if (!job) throw new Error('Job advert not found');

    if (jobTitle) job.jobTitle = jobTitle;
    if (params.advertDate) job.advertDate = params.advertDate;
    if (params.company) job.company = params.company;
    if (params.url) job.url = params.url;
    if (area !== undefined) job.area = area;
    if (params.salary !== undefined) job.salary = params.salary;
    if (employmentType !== undefined) {
      job.employmentType = employmentType;
      job.employment_type = employmentType;
    }
    if (params.highlights !== undefined) job.highlights = params.highlights;
    job.updatedAt = new Date().toISOString();

    return job;
  }

  async deleteJob(id: number): Promise<void> {
    if (isMySqlConnected) {
      const deleted = await JobModel.destroy({ where: { id } });
      if (!deleted) throw new Error('Job advert not found');
      return;
    }

    const index = this.jobsMemory.findIndex((j) => j.id === id);
    if (index === -1) throw new Error('Job advert not found');
    this.jobsMemory.splice(index, 1);
  }
}

export const store = new DataStore();

