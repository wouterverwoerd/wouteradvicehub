import { Sequelize, DataTypes, Model, Optional } from 'sequelize';

export interface JobAttributes {
  id: number;
  jobTitle: string;
  company: string;
  advertDate: string;
  url?: string;
  area?: string;
  salary?: string | null;
  employmentType?: string | null;
  highlights?: string[] | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface JobCreationAttributes extends Optional<JobAttributes, 'id' | 'url' | 'area' | 'salary' | 'employmentType' | 'highlights'> {}

export class Job extends Model<JobAttributes, JobCreationAttributes> implements JobAttributes {
  public id!: number;
  public jobTitle!: string;
  public company!: string;
  public advertDate!: string;
  public url!: string;
  public area!: string;
  public salary!: string | null;
  public employmentType!: string | null;
  public highlights!: string[] | null;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

export default function initJobModel(sequelize: Sequelize): typeof Job {
  Job.init(
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      jobTitle: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: { msg: 'Job title is required' },
        },
      },
      company: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: { msg: 'Company is required' },
        },
      },
      advertDate: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: { msg: 'Advert date is required' },
        },
      },
      url: {
        type: DataTypes.STRING(2048),
        allowNull: true,
        defaultValue: '#',
      },
      area: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: 'Remote / Global',
      },
      salary: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      employmentType: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      highlights: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: [],
      },
    },
    {
      sequelize,
      tableName: 'jobs',
      modelName: 'Job',
      timestamps: true,
      indexes: [
        {
          name: 'jobs_company_title_idx',
          fields: ['company', 'jobTitle'],
        },
        {
          name: 'jobs_advertDate_idx',
          fields: ['advertDate'],
        },
      ],
    }
  );

  return Job;
}
