mod auth;
mod config;
mod db;
mod errors;
mod handlers;
mod middleware;
mod models;
mod utils;

use rocket::{launch, routes, State};
use tracing_subscriber;

#[launch]
fn rocket() -> _ {
    // Initialize tracing
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::from_default_env()
                .add_directive(tracing_subscriber::filter::LevelFilter::INFO.into()),
        )
        .init();

    // Load configuration
    let config = config::Config::from_env();
    tracing::info!("Starting server on port {}", config.port);

    // Initialize database pool
    let db_pool = tokio::task::block_in_place(|| {
        tokio::runtime::Handle::current().block_on(async {
            db::init_pool(&config)
                .await
                .expect("Failed to initialize database pool")
        })
    });

    // Initialize JWT manager
    let jwt_manager = auth::JwtManager::new(&config.jwt_secret, 24);

    // Mount routes
    rocket::build()
        .manage(db_pool)
        .manage(jwt_manager)
        .mount("/", routes![handlers::health_check])
        .mount("/api", routes![
            handlers::register,
            handlers::login,
            handlers::get_profile,
        ])
}
