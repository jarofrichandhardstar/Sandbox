mod auth;
mod config;
mod cors;
mod db;
mod errors;
mod handlers;
mod middleware;
mod models;
mod utils;

use rocket::routes;

#[rocket::main]
async fn main() -> Result<(), rocket::Error> {
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::from_default_env()
                .add_directive(tracing_subscriber::filter::LevelFilter::INFO.into()),
        )
        .init();

    if let Err(e) = crate::utils::images::ensure_upload_dir() {
        tracing::error!("Failed to initialize upload directory: {:?}", e);
    }

    let config = config::Config::from_env();
    tracing::info!("Starting server on port {}", config.port);

    let db_pool = db::init_pool(&config)
        .await
        .expect("Failed to initialize database pool");

    db::run_migrations(&db_pool)
        .await
        .expect("Failed to run migrations");

    let jwt_manager = auth::JwtManager::new(&config.jwt_secret, 24);

    let figment = rocket::Config::figment()
        .merge(("address", "0.0.0.0"))
        .merge(("port", config.port));

    rocket::custom(figment)
        .attach(cors::Cors)
        .manage(db_pool)
        .manage(jwt_manager)
        .mount("/", routes![handlers::health_check, cors::preflight])
        .mount("/api", routes![
            handlers::register,
            handlers::login,
            handlers::get_profile,
            handlers::orders::checkout,
            handlers::orders::estimate_shipping,
            handlers::content::list_public_content,
        ])
        .mount("/api/cart", routes![
            handlers::orders::list_cart,
            handlers::orders::add_to_cart,
            handlers::orders::update_cart_item,
            handlers::orders::delete_cart_item,
        ])
        .mount("/api/admin", routes![
            handlers::admin::create_inventory,
            handlers::admin::list_inventory,
            handlers::admin::get_inventory,
            handlers::admin::update_inventory,
            handlers::admin::delete_inventory,
            handlers::admin::publish_inventory,
            handlers::admin::update_stock,
            handlers::admin::create_stock,
            handlers::admin::upload_product_image,
            handlers::admin::delete_product_image,
            handlers::admin::create_shipping_coverage,
            handlers::admin::list_shipping_coverage,
            handlers::admin::update_shipping_coverage,
            handlers::admin::delete_shipping_coverage,
            handlers::content::list_all_content,
            handlers::content::update_content,
            handlers::content::create_content,
            handlers::content::delete_content,
            handlers::content::upload_content_image,
        ])
        .mount("/api/products", routes![
            handlers::products::list_published_products,
            handlers::products::get_published_product,
            handlers::products::search_products,
        ])
        .mount("/api", routes![
            handlers::products::serve_product_image,
        ])
        .launch()
        .await?;

    Ok(())
}
