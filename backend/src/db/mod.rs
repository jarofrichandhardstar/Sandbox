use sqlx::postgres::PgPoolOptions;
use sqlx::{Pool, Postgres};
use crate::config::Config;
use crate::errors::Result;

pub type DbPool = Pool<Postgres>;

pub async fn init_pool(config: &Config) -> Result<DbPool> {
    PgPoolOptions::new()
        .max_connections(5)
        .connect(&config.database_url)
        .await
        .map_err(|e| {
            tracing::error!("Failed to connect to database: {}", e);
            crate::errors::ApiError::Database(format!("Connection failed: {}", e))
        })
}

pub async fn run_migrations(pool: &DbPool) -> Result<()> {
    sqlx::migrate!("./migrations")
        .run(pool)
        .await
        .map_err(|e| {
            tracing::error!("Failed to run migrations: {}", e);
            crate::errors::ApiError::Database(format!("Migration failed: {}", e))
        })
}
