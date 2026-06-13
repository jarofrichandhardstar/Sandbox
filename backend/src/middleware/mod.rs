use rocket::http::Status;
use rocket::request::{self, FromRequest, Request};
use crate::auth::Claims;
use crate::errors::ApiError;

pub struct AuthGuard {
    pub claims: Claims,
}

#[rocket::async_trait]
impl<'r> FromRequest<'r> for AuthGuard {
    type Error = ApiError;

    async fn from_request(request: &'r Request<'_>) -> request::Outcome<Self, Self::Error> {
        let auth_header = request.headers().get_one("Authorization");

        match auth_header {
            None => request::Outcome::Error((
                Status::Unauthorized,
                ApiError::Unauthorized,
            )),
            Some(auth) => {
                let parts: Vec<&str> = auth.split_whitespace().collect();

                if parts.len() != 2 || parts[0] != "Bearer" {
                    return request::Outcome::Error((
                        Status::Unauthorized,
                        ApiError::InvalidToken,
                    ));
                }

                let token = parts[1];
                let jwt_manager = request
                    .guard::<&rocket::State<crate::auth::JwtManager>>()
                    .await;

                match jwt_manager {
                    request::Outcome::Success(manager) => {
                        match manager.verify_token(token) {
                            Ok(claims) => request::Outcome::Success(AuthGuard { claims }),
                            Err(e) => request::Outcome::Error((Status::Unauthorized, e)),
                        }
                    }
                    _ => request::Outcome::Error((
                        Status::InternalServerError,
                        ApiError::InternalError,
                    )),
                }
            }
        }
    }
}

// Admin guard - requires admin role
pub struct AdminGuard {
    pub claims: Claims,
}

#[rocket::async_trait]
impl<'r> FromRequest<'r> for AdminGuard {
    type Error = ApiError;

    async fn from_request(request: &'r Request<'_>) -> request::Outcome<Self, Self::Error> {
        let auth_guard = request.guard::<AuthGuard>().await;

        match auth_guard {
            request::Outcome::Success(guard) => {
                // Verify user is admin by checking in database
                let pool = request.guard::<&rocket::State<crate::db::DbPool>>().await;

                match pool {
                    request::Outcome::Success(db_pool) => {
                        let user_id = uuid::Uuid::parse_str(&guard.claims.sub);
                        
                        if let Ok(user_id) = user_id {
                            match sqlx::query_as::<_, (String,)>(
                                "SELECT role FROM users WHERE id = $1"
                            )
                            .bind(user_id)
                            .fetch_optional(db_pool.inner())
                            .await
                            {
                                Ok(Some((role,))) => {
                                    if role == "admin" {
                                        request::Outcome::Success(AdminGuard { 
                                            claims: guard.claims 
                                        })
                                    } else {
                                        request::Outcome::Error((
                                            Status::Forbidden,
                                            ApiError::Unauthorized,
                                        ))
                                    }
                                }
                                _ => request::Outcome::Error((
                                    Status::InternalServerError,
                                    ApiError::InternalError,
                                )),
                            }
                        } else {
                            request::Outcome::Error((
                                Status::Unauthorized,
                                ApiError::InvalidToken,
                            ))
                        }
                    }
                    _ => request::Outcome::Error((
                        Status::InternalServerError,
                        ApiError::InternalError,
                    )),
                }
            }
            request::Outcome::Error(e) => request::Outcome::Error(e),
            request::Outcome::Forward(f) => request::Outcome::Forward(f),
        }
    }
}
