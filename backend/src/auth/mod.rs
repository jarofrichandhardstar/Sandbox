use chrono::{Duration, Utc};
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize)]
pub struct Claims {
    pub sub: String,         // subject (user ID)
    pub email: String,
    pub iat: i64,            // issued at
    pub exp: i64,            // expiration time
}

pub struct JwtManager {
    encoding_key: EncodingKey,
    decoding_key: DecodingKey,
    expiration_hours: i64,
}

impl JwtManager {
    pub fn new(secret: &str, expiration_hours: i64) -> Self {
        JwtManager {
            encoding_key: EncodingKey::from_secret(secret.as_ref()),
            decoding_key: DecodingKey::from_secret(secret.as_ref()),
            expiration_hours,
        }
    }

    pub fn generate_token(&self, user_id: Uuid, email: &str) -> crate::errors::Result<String> {
        let now = Utc::now();
        let expire = now + Duration::hours(self.expiration_hours);

        let claims = Claims {
            sub: user_id.to_string(),
            email: email.to_string(),
            iat: now.timestamp(),
            exp: expire.timestamp(),
        };

        encode(&Header::default(), &claims, &self.encoding_key)
            .map_err(|e| {
                tracing::error!("Failed to encode JWT: {}", e);
                crate::errors::ApiError::InternalError
            })
    }

    pub fn verify_token(&self, token: &str) -> crate::errors::Result<Claims> {
        decode::<Claims>(token, &self.decoding_key, &Validation::default())
            .map(|data| data.claims)
            .map_err(|e| {
                tracing::error!("Failed to verify JWT: {}", e);
                crate::errors::ApiError::InvalidToken
            })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_generate_and_verify_token() {
        let manager = JwtManager::new("test-secret", 24);
        let user_id = Uuid::new_v4();
        let email = "test@example.com";

        let token = manager.generate_token(user_id, email).unwrap();
        let claims = manager.verify_token(&token).unwrap();

        assert_eq!(claims.sub, user_id.to_string());
        assert_eq!(claims.email, email);
    }
}
