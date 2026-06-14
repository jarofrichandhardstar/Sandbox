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
use aws_config;
use aws_sdk_s3;

#[rocket::main]
async fn main() -> Result<(), rocket::Error> {
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::from_default_env()
                .add_directive(tracing_subscriber::filter::LevelFilter::INFO.into()),
        )
        .init();

    let config = config::Config::from_env();
    tracing::info!("Starting server on port {}", config.port);

    // Initialise storage backend: S3 when S3_BUCKET is set, local disk otherwise
    let storage = if let Some(bucket) = config.s3_bucket.clone() {
        let aws_cfg = aws_config::load_from_env().await;
        let mut s3_builder = aws_sdk_s3::config::Builder::from(&aws_cfg);
        if let Some(endpoint) = &config.s3_endpoint {
            // Custom endpoint needed for Cloudflare R2, MinIO, etc.
            s3_builder = s3_builder
                .endpoint_url(endpoint)
                .force_path_style(true);
        }
        let client = aws_sdk_s3::Client::from_conf(s3_builder.build());
        let public_url = config.s3_public_url.clone().unwrap_or_else(|| {
            let region = config.s3_region.as_deref().unwrap_or("us-east-1");
            format!("https://{}.s3.{}.amazonaws.com", bucket, region)
        });
        tracing::info!("Storage: S3  bucket={}  public_url={}", bucket, public_url);
        utils::images::StorageService::s3(client, bucket, public_url)
    } else {
        if let Err(e) = utils::images::ensure_upload_dir() {
            tracing::error!("Failed to create local upload directory: {:?}", e);
        }
        tracing::info!("Storage: local disk (uploads/products/)");
        utils::images::StorageService::local()
    };

    let db_pool = db::init_pool(&config)
        .await
        .expect("Failed to initialize database pool");

    db::run_migrations(&db_pool)
        .await
        .expect("Failed to run migrations");

    let jwt_manager  = auth::JwtManager::new(&config.jwt_secret, 24);
    let email_svc    = utils::email::EmailService::from_config(&config);

    let figment = rocket::Config::figment()
        .merge(("address", "0.0.0.0"))
        .merge(("port", config.port))
        .merge(("limits.bytes", 8 * 1024 * 1024u64)); // 8 MB for image uploads

    rocket::custom(figment)
        .attach(cors::Cors)
        .manage(db_pool)
        .manage(jwt_manager)
        .manage(email_svc)
        .manage(storage)
        .mount("/", routes![handlers::health_check, cors::preflight])
        .mount("/api", routes![
            handlers::register,
            handlers::verify_email,
            handlers::resend_otp,
            handlers::login,
            handlers::get_profile,
            handlers::forgot_password,
            handlers::reset_password,
            handlers::orders::checkout,
            handlers::orders::estimate_shipping,
            handlers::content::list_public_content,
        ])
        .mount("/api", routes![
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
            handlers::admin::list_orders,
            handlers::admin::get_order,
            handlers::admin::update_order_status,
            handlers::content::list_all_content,
            handlers::content::update_content,
            handlers::content::create_content,
            handlers::content::delete_content,
            handlers::content::upload_content_image,
        ])
        .mount("/api", routes![
            handlers::products::list_published_products,
            handlers::products::get_published_product,
            handlers::products::search_products,
            handlers::products::serve_product_image,
        ])
        .launch()
        .await?;

    Ok(())
}
