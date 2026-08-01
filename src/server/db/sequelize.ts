import { Sequelize, DataTypes, Model } from 'sequelize';

import dotenv from 'dotenv';

dotenv.config();

// Database configuration reading environment variables (supporting wouteradvicenode env naming)
const dbHost = process.env.REACT_APP_API_HOST || process.env.DB_HOST || process.env.MYSQL_HOST || '';
const dbPort = parseInt(process.env.REACT_APP_API_PORT || process.env.DB_PORT || '3306', 10);
const dbUser = process.env.REACT_APP_API_USER || process.env.DB_USER || process.env.MYSQL_USER || '';
const dbPassword = process.env.REACT_APP_API_PASSWORD || process.env.DB_PASSWORD || process.env.MYSQL_PASSWORD || '';
const dbName = process.env.REACT_APP_API_DATABASE || process.env.DB_NAME || process.env.MYSQL_DATABASE || 'wouteradvicenode';
const dbDialect = (process.env.REACT_APP_API_SEQUALIZE || process.env.DB_DIALECT || 'mysql') as any;

export const sequelize = new Sequelize(dbName, dbUser, dbPassword, {
  host: dbHost,
  port: dbPort,
  dialect: dbDialect,
  logging: false, // Disable verbose SQL logging in stdout
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
});

// Model Definitions
export class UserModel extends Model {}
UserModel.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    title: { type: DataTypes.STRING, allowNull: true },
    firstName: { type: DataTypes.STRING, allowNull: false },
    lastName: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, allowNull: false, unique: true },
    role: { type: DataTypes.STRING, allowNull: false, defaultValue: 'User' },
    passwordHash: { type: DataTypes.STRING, allowNull: false },
  },
  { sequelize, modelName: 'User', tableName: 'users', timestamps: true }
);

export class AdviceModel extends Model {}
AdviceModel.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    content: { type: DataTypes.TEXT, allowNull: false },
    userid: { type: DataTypes.STRING, allowNull: false },
    touserid: { type: DataTypes.STRING, allowNull: false },
    filename: { type: DataTypes.STRING, allowNull: false },
  },
  { sequelize, modelName: 'Advice', tableName: 'advices', timestamps: true }
);

export class EventModel extends Model {}
EventModel.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    description: { type: DataTypes.TEXT, allowNull: false },
    userid: { type: DataTypes.INTEGER, allowNull: false },
    adviceid: { type: DataTypes.INTEGER, allowNull: false },
    eventDate: { type: DataTypes.STRING, allowNull: false },
    eventFilename: { type: DataTypes.STRING, allowNull: false },
  },
  { sequelize, modelName: 'Event', tableName: 'events', timestamps: true }
);

export class IdeaModel extends Model {}
IdeaModel.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    description: { type: DataTypes.TEXT, allowNull: false },
    ideaDate: { type: DataTypes.STRING, allowNull: false },
    ideaFilename: { type: DataTypes.STRING, allowNull: false },
  },
  { sequelize, modelName: 'Idea', tableName: 'ideas', timestamps: true }
);

export class JobModel extends Model {}
JobModel.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    jobTitle: { type: DataTypes.STRING, allowNull: false },
    advertDate: { type: DataTypes.STRING, allowNull: false },
    company: { type: DataTypes.STRING, allowNull: false },
    url: { type: DataTypes.STRING, allowNull: false },
  },
  { sequelize, modelName: 'Job', tableName: 'jobs', timestamps: true }
);

// Associations
AdviceModel.hasMany(EventModel, { foreignKey: 'adviceid', as: 'Events' });
EventModel.belongsTo(AdviceModel, { foreignKey: 'adviceid', as: 'Advice' });

export let isMySqlConnected = false;

export async function initMySqlConnection(): Promise<boolean> {
  try {
    await sequelize.authenticate();
    await sequelize.sync({ alter: true });
    isMySqlConnected = true;
    console.log(`[MySQL] Connected successfully to MySQL database "${dbName}" at ${dbHost}:${dbPort} using Sequelize`);
    return true;
  } catch (err: any) {
    isMySqlConnected = false;
    if (err.message && err.message.includes('Access denied')) {
      console.warn(`[MySQL Error] Authentication failed: ${err.message}`);
      console.warn(`[MySQL Fix] Set your MySQL password in a .env file:\n  REACT_APP_API_PASSWORD=your_mysql_password\n  or DB_PASSWORD=your_mysql_password`);
    } else {
      console.warn(`[MySQL Notice] Could not connect to MySQL server (${err.message || 'Connection refused'}). Falling back to in-memory store until MySQL service is running.`);
    }
    return false;
  }
}
