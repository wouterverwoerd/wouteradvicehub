const { DataTypes } = require('sequelize');

module.exports = model;

/**
 * Sequelize Model Definition for Job
 * Built using the idea.model.js architecture for Wouter Advice / React Server.
 * 
 * Supports:
 * - Single job posting & bulk import with uniqueness
 * - Structured highlights (JSON array)
 * - Flexible location/area & salary fields
 * - Timestamps (createdAt, updatedAt)
 */
function model(sequelize) {
    const attributes = {
        // Job Title / Headline
        jobTitle: { 
            type: DataTypes.STRING, 
            allowNull: false,
            validate: {
                notEmpty: { msg: 'Job title is required' }
            }
        },

        // Hiring Organization / Company name
        company: { 
            type: DataTypes.STRING, 
            allowNull: false,
            validate: {
                notEmpty: { msg: 'Company is required' }
            }
        },

        // Date of listing or import (YYYY-MM-DD or ISO string)
        advertDate: { 
            type: DataTypes.STRING, 
            allowNull: false,
            validate: {
                notEmpty: { msg: 'Advert date is required' }
            }
        },

        // Link to original job listing or external advert
        url: { 
            type: DataTypes.STRING(2048), 
            allowNull: true, 
            defaultValue: '#' 
        },

        // Location / City / Region (e.g., 'Christchurch', 'Auckland', 'Remote')
        area: { 
            type: DataTypes.STRING, 
            allowNull: true, 
            defaultValue: 'Remote / Global' 
        },

        // Salary range or compensation package (e.g., '$85,000 - $110,000')
        salary: { 
            type: DataTypes.STRING, 
            allowNull: true 
        },

        // Employment type (e.g., 'Full time', 'Contract', 'Part time')
        employmentType: { 
            type: DataTypes.STRING, 
            allowNull: true 
        },

        // Array of highlights / key responsibilities / perks stored as JSON
        highlights: { 
            type: DataTypes.JSON, 
            allowNull: true,
            defaultValue: [] 
        }
    };

    const options = {
        tableName: 'jobs',
        timestamps: true,
        // Composite index to support deduplication and fast queries by company and title
        indexes: [
            {
                name: 'jobs_company_title_idx',
                fields: ['company', 'jobTitle']
            },
            {
                name: 'jobs_advertDate_idx',
                fields: ['advertDate']
            }
        ]
    };

    return sequelize.define('Job', attributes, options);
}
