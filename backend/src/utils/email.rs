use crate::config::Config;

pub struct EmailService {
    pub smtp_host:     Option<String>,
    pub smtp_port:     u16,
    pub smtp_user:     Option<String>,
    pub smtp_password: Option<String>,
    pub smtp_from:     String,
    pub app_url:       String,
}

impl EmailService {
    pub fn from_config(config: &Config) -> Self {
        if config.smtp_host.is_none() {
            tracing::warn!("SMTP not configured — emails will be printed to the log");
        }
        EmailService {
            smtp_host:     config.smtp_host.clone(),
            smtp_port:     config.smtp_port,
            smtp_user:     config.smtp_user.clone(),
            smtp_password: config.smtp_password.clone(),
            smtp_from:     config.smtp_from.clone(),
            app_url:       config.app_url.trim_end_matches('/').to_string(),
        }
    }

    pub async fn send_otp(&self, to: &str, username: &str, otp: &str) {
        let subject = "Verify your email".to_string();
        let body = format!(
            "Hi {username},\n\nYour verification code is:\n\n    {otp}\n\nIt expires in 10 minutes.\n\nIf you did not register, ignore this email."
        );
        if let Err(e) = self.send(to, &subject, &body).await {
            tracing::error!("OTP email to {to} failed: {e}");
        }
    }

    pub async fn send_password_reset(&self, to: &str, token: &str) {
        let url = format!("{}/reset-password?token={}", self.app_url, token);
        let subject = "Reset your password".to_string();
        let body = format!(
            "You requested a password reset.\n\nClick the link below:\n\n{url}\n\nThis link expires in 1 hour.\n\nIf you did not request this, ignore this email."
        );
        if let Err(e) = self.send(to, &subject, &body).await {
            tracing::error!("Password-reset email to {to} failed: {e}");
        }
    }

    async fn send(&self, to: &str, subject: &str, body: &str) -> anyhow::Result<()> {
        match (&self.smtp_host, &self.smtp_user, &self.smtp_password) {
            (Some(host), Some(user), Some(pass)) => {
                use lettre::{
                    message::header::ContentType,
                    transport::smtp::authentication::Credentials,
                    AsyncSmtpTransport, AsyncTransport, Message, Tokio1Executor,
                };
                let email = Message::builder()
                    .from(self.smtp_from.parse()?)
                    .to(to.parse()?)
                    .subject(subject)
                    .header(ContentType::TEXT_PLAIN)
                    .body(body.to_string())?;
                let creds = Credentials::new(user.clone(), pass.clone());
                let mailer = AsyncSmtpTransport::<Tokio1Executor>::starttls_relay(host)?
                    .credentials(creds)
                    .port(self.smtp_port)
                    .build();
                mailer.send(email).await?;
                Ok(())
            }
            _ => {
                // Development fallback — OTP visible in deployment logs
                tracing::info!("==== EMAIL (no SMTP) ====");
                tracing::info!("To: {to}");
                tracing::info!("Subject: {subject}");
                tracing::info!("{body}");
                tracing::info!("=========================");
                Ok(())
            }
        }
    }
}
