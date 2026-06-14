use crate::config::Config;

pub struct EmailService {
    pub resend_api_key:   Option<String>,
    pub sendgrid_api_key: Option<String>,
    pub smtp_host:        Option<String>,
    pub smtp_port:        u16,
    pub smtp_user:        Option<String>,
    pub smtp_password:    Option<String>,
    pub smtp_from:        String,
    pub app_url:          String,
}

impl EmailService {
    pub fn from_config(config: &Config) -> Self {
        let svc = EmailService {
            resend_api_key:   config.resend_api_key.clone(),
            sendgrid_api_key: config.sendgrid_api_key.clone(),
            smtp_host:        config.smtp_host.clone(),
            smtp_port:        config.smtp_port,
            smtp_user:        config.smtp_user.clone(),
            smtp_password:    config.smtp_password.clone(),
            smtp_from:        config.smtp_from.clone(),
            app_url:          config.app_url.trim_end_matches('/').to_string(),
        };
        if svc.resend_api_key.is_some() {
            tracing::info!("Email transport: Resend API (from={})", svc.smtp_from);
        } else if svc.sendgrid_api_key.is_some() {
            tracing::info!("Email transport: SendGrid API (from={})", svc.smtp_from);
        } else if svc.smtp_host.is_some() {
            tracing::info!(
                "Email transport: SMTP (host={} port={}) — note: Railway blocks outbound SMTP",
                svc.smtp_host.as_deref().unwrap_or(""),
                svc.smtp_port,
            );
        } else {
            tracing::warn!("Email transport: none configured — emails printed to logs only");
        }
        svc
    }

    pub async fn send_otp(&self, to: &str, username: &str, otp: &str) {
        let subject = "Verify your email";
        let body = format!(
            "Hi {username},\n\nYour verification code is:\n\n    {otp}\n\nIt expires in 10 minutes.\n\nIf you did not register, ignore this email."
        );
        if let Err(e) = self.send(to, subject, &body).await {
            tracing::error!("OTP email to {to} failed: {e:#}");
            tracing::warn!("=== OTP FALLBACK (email failed) === to={to} otp={otp} ===");
        }
    }

    pub async fn send_password_reset(&self, to: &str, token: &str) {
        let url = format!("{}/reset-password?token={}", self.app_url, token);
        let subject = "Reset your password";
        let body = format!(
            "You requested a password reset.\n\nClick the link below:\n\n{url}\n\nThis link expires in 1 hour.\n\nIf you did not request this, ignore this email."
        );
        if let Err(e) = self.send(to, subject, &body).await {
            tracing::error!("Password-reset email to {to} failed: {e:#}");
            tracing::warn!("=== RESET FALLBACK (email failed) === to={to} url={url} ===");
        }
    }

    async fn send(&self, to: &str, subject: &str, body: &str) -> anyhow::Result<()> {
        // Priority 1: Resend HTTP API (works on Railway)
        if let Some(key) = &self.resend_api_key {
            return self.send_resend(key, to, subject, body).await;
        }

        // Priority 2: SendGrid HTTP API (works on Railway, no custom domain needed)
        if let Some(key) = &self.sendgrid_api_key {
            return self.send_sendgrid(key, to, subject, body).await;
        }

        // Priority 3: SMTP (blocked by Railway on port 587/465; works on other hosts)
        if let (Some(host), Some(user), Some(pass)) =
            (&self.smtp_host, &self.smtp_user, &self.smtp_password)
        {
            return self.send_smtp(host, user, pass, to, subject, body).await;
        }

        // Fallback: log so development is still usable
        tracing::info!("==== EMAIL (no transport configured) ====");
        tracing::info!("To: {to}");
        tracing::info!("Subject: {subject}");
        tracing::info!("{body}");
        tracing::info!("=========================================");
        Ok(())
    }

    async fn send_resend(
        &self, api_key: &str, to: &str, subject: &str, body: &str,
    ) -> anyhow::Result<()> {
        let client = reqwest::Client::new();
        let resp = client
            .post("https://api.resend.com/emails")
            .header("Authorization", format!("Bearer {api_key}"))
            .json(&serde_json::json!({
                "from": self.smtp_from,
                "to":   [to],
                "subject": subject,
                "text": body,
            }))
            .send()
            .await
            .map_err(|e| anyhow::anyhow!("Resend HTTP error: {e}"))?;

        let status = resp.status();
        if !status.is_success() {
            let text = resp.text().await.unwrap_or_default();
            return Err(anyhow::anyhow!("Resend error {status}: {text}"));
        }
        tracing::info!("Email sent via Resend to {to}: {subject}");
        Ok(())
    }

    async fn send_sendgrid(
        &self, api_key: &str, to: &str, subject: &str, body: &str,
    ) -> anyhow::Result<()> {
        let client = reqwest::Client::new();
        let resp = client
            .post("https://api.sendgrid.com/v3/mail/send")
            .header("Authorization", format!("Bearer {api_key}"))
            .json(&serde_json::json!({
                "personalizations": [{ "to": [{ "email": to }] }],
                "from": { "email": self.smtp_from },
                "subject": subject,
                "content": [{ "type": "text/plain", "value": body }],
            }))
            .send()
            .await
            .map_err(|e| anyhow::anyhow!("SendGrid HTTP error: {e}"))?;

        let status = resp.status();
        // SendGrid returns 202 Accepted on success
        if !status.is_success() {
            let text = resp.text().await.unwrap_or_default();
            return Err(anyhow::anyhow!("SendGrid error {status}: {text}"));
        }
        tracing::info!("Email sent via SendGrid to {to}: {subject}");
        Ok(())
    }

    async fn send_smtp(
        &self, host: &str, user: &str, pass: &str, to: &str, subject: &str, body: &str,
    ) -> anyhow::Result<()> {
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

        let creds = Credentials::new(user.to_string(), pass.to_string());

        // Port 465 = implicit SSL; everything else uses STARTTLS
        let mailer = if self.smtp_port == 465 {
            AsyncSmtpTransport::<Tokio1Executor>::relay(host)?
                .credentials(creds)
                .port(465)
                .build()
        } else {
            AsyncSmtpTransport::<Tokio1Executor>::starttls_relay(host)?
                .credentials(creds)
                .port(self.smtp_port)
                .build()
        };

        mailer.send(email).await.map_err(|e| {
            anyhow::anyhow!(
                "SMTP error (host={host} port={} user={user}): {e}",
                self.smtp_port
            )
        })?;

        tracing::info!("Email sent via SMTP to {to}: {subject}");
        Ok(())
    }
}
