import { Op } from 'sequelize';
import { JobModel } from '../db/sequelize.js';
import { Job, JobInput } from '../../types.js';

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

export function isDuplicate(a: any, b: any): boolean {
  if (!a || !b) return false;

  const urlA = normalizeJobUrl(a.url);
  const urlB = normalizeJobUrl(b.url);
  if (urlA && urlB && urlA === urlB) {
    return true;
  }

  const titleA = (a.jobTitle || a.title || '').trim().toLowerCase().replace(/\s+/g, ' ');
  const titleB = (b.jobTitle || b.title || '').trim().toLowerCase().replace(/\s+/g, ' ');
  const compA = (a.company || '').trim().toLowerCase().replace(/\s+/g, ' ');
  const compB = (b.company || '').trim().toLowerCase().replace(/\s+/g, ' ');

  if (titleA && titleB && compA && compB && titleA === titleB && compA === compB) {
    const areaA = (a.area || a.location || '').trim().toLowerCase();
    const areaB = (b.area || b.location || '').trim().toLowerCase();

    if (!areaA || !areaB || areaA.includes('remote') || areaB.includes('remote') || areaA === areaB || areaA.includes(areaB) || areaB.includes(areaA)) {
      return true;
    }

    const cities = ['christchurch', 'auckland', 'wellington', 'hamilton', 'tauranga', 'dunedin', 'canterbury'];
    const cityA = cities.find((c) => areaA.includes(c));
    const cityB = cities.find((c) => areaB.includes(c));
    if (cityA && cityB && cityA === cityB) return true;
    if (cityA && cityB && cityA !== cityB) return false;

    return true;
  }

  return false;
}

export async function getAll(filter?: { search?: string; area?: string; company?: string }): Promise<Job[]> {
  const where: any = {};
  if (filter?.company) {
    where.company = { [Op.like]: `%${filter.company}%` };
  }
  if (filter?.area) {
    where.area = { [Op.like]: `%${filter.area}%` };
  }
  if (filter?.search) {
    where[Op.or] = [
      { jobTitle: { [Op.like]: `%${filter.search}%` } },
      { company: { [Op.like]: `%${filter.search}%` } },
      { area: { [Op.like]: `%${filter.search}%` } },
    ];
  }

  const rows = await JobModel.findAll({
    where: Object.keys(where).length > 0 ? where : undefined,
    order: [['createdAt', 'DESC']],
  });
  return rows.map((r) => r.toJSON() as Job);
}

export async function getById(id: number): Promise<Job> {
  const job = await JobModel.findByPk(id);
  if (!job) throw new Error('Job advert not found');
  return job.toJSON() as Job;
}

export async function create(params: JobInput, allowDuplicate = false): Promise<Job> {
  const jobTitle = params.jobTitle || params.title;
  const company = params.company;

  if (!jobTitle) throw new Error('Job title is required');
  if (!company) throw new Error('Company is required');

  if (!allowDuplicate) {
    const all = await JobModel.findAll();
    const existingJobs = all.map((r) => r.toJSON() as Job);
    const duplicate = existingJobs.find((j) => isDuplicate(params, j));
    if (duplicate) {
      throw new Error(`A job listing for "${jobTitle}" at "${company}" already exists.`);
    }
  }

  const created = await JobModel.create({
    jobTitle,
    company,
    advertDate: params.advertDate || new Date().toISOString().slice(0, 19).replace('T', ' '),
    url: params.url || '#',
    area: (params.area || params.location || 'Remote / Global').trim(),
    salary: params.salary || null,
    employmentType: params.employmentType || params.employment_type || null,
    highlights: Array.isArray(params.highlights) ? params.highlights : (params.highlights ? [params.highlights] : []),
  });

  return created.toJSON() as Job;
}

export async function update(id: number, params: Partial<JobInput>): Promise<Job> {
  const job = await JobModel.findByPk(id);
  if (!job) throw new Error('Job advert not found');

  const current = job.toJSON() as Job;
  const newTitle = params.jobTitle || params.title || current.jobTitle;
  const newCompany = params.company || current.company;

  if (newTitle !== current.jobTitle || newCompany !== current.company) {
    const others = await JobModel.findAll({
      where: { id: { [Op.ne]: id } },
    });
    const conflict = others.map((o) => o.toJSON()).find((j) => isDuplicate({ jobTitle: newTitle, company: newCompany, url: params.url || current.url, area: params.area || current.area }, j));
    if (conflict) {
      throw new Error(`Cannot update: A job listing for "${newTitle}" at "${newCompany}" already exists.`);
    }
  }

  const updateData: any = {};
  if (params.jobTitle || params.title) updateData.jobTitle = newTitle;
  if (params.company) updateData.company = newCompany;
  if (params.advertDate) updateData.advertDate = params.advertDate;
  if (params.url !== undefined) updateData.url = params.url;
  if (params.area !== undefined || params.location !== undefined) updateData.area = (params.area || params.location || '').trim();
  if (params.salary !== undefined) updateData.salary = params.salary;
  if (params.employmentType !== undefined || params.employment_type !== undefined) {
    updateData.employmentType = params.employmentType || params.employment_type;
  }
  if (params.highlights !== undefined) {
    updateData.highlights = Array.isArray(params.highlights) ? params.highlights : (params.highlights ? [params.highlights] : []);
  }

  await job.update(updateData);
  return job.toJSON() as Job;
}

export async function _delete(id: number): Promise<void> {
  const job = await JobModel.findByPk(id);
  if (!job) throw new Error('Job advert not found');
  await job.destroy();
}

export async function bulkImport(
  jobsList: any[],
  options: { deduplicate?: boolean; updateExisting?: boolean } = { deduplicate: true, updateExisting: false }
) {
  if (!Array.isArray(jobsList)) throw new Error('Expected an array of job objects');

  const deduplicateFlag = options.deduplicate !== false;
  const updateExisting = options.updateExisting === true;

  const all = await JobModel.findAll();
  const existingJobs = all.map((r) => r.toJSON() as Job);
  const created: Job[] = [];
  const updated: Job[] = [];
  const duplicateTitles: string[] = [];
  let skippedDuplicates = 0;

  for (const item of jobsList) {
    if (!item || typeof item !== 'object') continue;
    const title = item.jobTitle || item.title;
    const company = item.company;
    if (!title && !company) continue;

    if (deduplicateFlag) {
      const match = existingJobs.find((existing) => isDuplicate(item, existing));
      if (match) {
        duplicateTitles.push(title || match.jobTitle);
        skippedDuplicates++;

        if (updateExisting) {
          const matchInstance = await JobModel.findByPk(match.id);
          if (matchInstance) {
            let hasUpdates = false;
            const updateData: any = {};
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
              await matchInstance.update(updateData);
              const updatedRecord = matchInstance.toJSON() as Job;
              updated.push(updatedRecord);
              Object.assign(match, updatedRecord);
            }
          }
        }
        continue;
      }
    }

    const createdRecord = await create(item, true);
    created.push(createdRecord);
    existingJobs.push(createdRecord);
  }

  return {
    created,
    updated,
    createdCount: created.length,
    skippedDuplicates,
    updatedCount: updated.length,
    totalProcessed: jobsList.length,
    duplicateTitles: [...new Set(duplicateTitles)],
  };
}

export async function deduplicate() {
  const all = await JobModel.findAll();
  const seen: Job[] = [];
  const toDelete: number[] = [];

  for (const jobInst of all) {
    const job = jobInst.toJSON() as Job;
    const match = seen.find((s) => isDuplicate(s, job));
    if (match) {
      toDelete.push(job.id);
    } else {
      seen.push(job);
    }
  }

  if (toDelete.length > 0) {
    await JobModel.destroy({ where: { id: { [Op.in]: toDelete } } });
  }

  return {
    removedCount: toDelete.length,
    remainingCount: seen.length,
  };
}

export { _delete as deleteJob };
