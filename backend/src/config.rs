use dotenv::dotenv;
use std::env;

#[derive(Clone, Debug)]
pub struct Config {
    pub database_url: String,
    pub jwt_secret:   String,
    pub port:         u16,
    pub log_level:    String,
    // Email / SMTP
    pub smtp_host:     Option<String>,
    pub smtp_port:     u16,
    pub smtp_user:     Option<String>,
    pub smtp_password: Option<String>,
    pub smtp_from:     String,
    // Frontend URL (used in password-reset links)
    pub app_url: String,
}

impl Config {
    pub fn from_env() -> Self {
        dotenv().ok();
        Config {
            database_url: env::var("DATABASE_URL")
                .unwrap_or_else(|_| "postgres://user:password@localhost/rust_backend".to_string()),
            jwt_secret: env::var("JWT_SECRET")
                .unwrap_or_else(|_| "your-secret-key-change-in-production".to_string()),
            port: env::var("PORT")
                .unwrap_or_else(|_| "8000".to_string())
                .parse()
                .unwrap_or(8000),
            log_level: env::var("RUST_LOG").unwrap_or_else(|_| "info".to_string()),
            smtp_host:     env::var("SMTP_HOST").ok(),
            smtp_port:     env::var("SMTP_PORT").ok().and_then(|p| p.parse().ok()).unwrap_or(587),
            smtp_user:     env::var("SMTP_USER").ok(),
            smtp_password: env::var("SMTP_PASSWORD").ok(),
            smtp_from:     env::var("SMTP_FROM").unwrap_or_else(|_| "noreply@shop.com".to_string()),
            app_url:       env::var("APP_URL").unwrap_or_default(),
        }
    }
}
