const { DataTypes } = require('sequelize');

module.exports = model;

/**
 * Sequelize Model Definition for Idea
 * Reference model for Wouter Advice / React Server.
 */
function model(sequelize) {
    const attributes = {
        description: { 
            type: DataTypes.TEXT, 
            allowNull: false 
        },
        ideaDate: { 
            type: DataTypes.STRING, 
            allowNull: false 
        },
        ideaFilename: { 
            type: DataTypes.STRING, 
            allowNull: false 
        }
    };

    const options = {
        tableName: 'ideas',
        timestamps: true
    };

    return sequelize.define('Idea', attributes, options);
}
