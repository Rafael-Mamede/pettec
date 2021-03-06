const { DB_CONFIG } = require('./.env')

module.exports = {
    client: 'postgresql',
    connection: DB_CONFIG,
    pool: {
        min: 2,
        max: 10
    },
    migrations: {
        tableName: 'knex_migrations'
    }
}