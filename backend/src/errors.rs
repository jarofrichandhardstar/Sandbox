use rocket::http::Status;
use rocket::response::{self, Responder};
use rocket::Request;
use std::io::Cursor;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum ApiError {
    #[error("Database error: {0}")]
    Database(String),

    #[error("Not found")]
    NotFound,

    #[error("Unauthorized")]
    Unauthorized,

    #[error("Invalid credentials")]
    InvalidCredentials,

    #[error("Invalid token")]
    InvalidToken,

    #[error("User already exists")]
    UserAlreadyExists,

    #[error("Internal server error")]
    InternalError,

    #[error("Bad request: {0}")]
    BadRequest(String),

    #[error("Validation error: {0}")]
    ValidationError(String),
}

#[derive(serde::Serialize)]
pub struct ErrorResponse {
    pub error: String,
    pub message: String,
}

impl<'r> Responder<'r, 'static> for ApiError {
    fn respond_to(self, _: &'r Request<'_>) -> response::Result<'static> {
        let (status, message) = match self {
            ApiError::Database(_) => (Status::InternalServerError, "Database error"),
            ApiError::NotFound => (Status::NotFound, "Not found"),
            ApiError::Unauthorized => (Status::Unauthorized, "Unauthorized"),
            ApiError::InvalidCredentials => (Status::Unauthorized, "Invalid credentials"),
            ApiError::InvalidToken => (Status::Unauthorized, "Invalid token"),
            ApiError::UserAlreadyExists => (Status::Conflict, "User already exists"),
            ApiError::InternalError => (Status::InternalServerError, "Internal server error"),
            ApiError::BadRequest(ref msg) => (Status::BadRequest, msg.as_str()),
            ApiError::ValidationError(ref msg) => (Status::BadRequest, msg.as_str()),
        };

        let error_response = ErrorResponse {
            error: status.code.to_string(),
            message: message.to_string(),
        };

        let body = serde_json::to_string(&error_response).unwrap_or_default();
        response::Response::build()
            .status(status)
            .header(rocket::http::ContentType::JSON)
            .sized_body(body.len(), Cursor::new(body))
            .ok()
    }
}

pub type Result<T> = std::result::Result<T, ApiError>;
