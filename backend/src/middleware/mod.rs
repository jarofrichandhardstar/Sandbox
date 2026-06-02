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
                    .guard::<rocket::State<crate::auth::JwtManager>>()
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
