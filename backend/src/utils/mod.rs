// Utility functions and constants

pub mod email;
pub mod images;

pub const DEFAULT_PAGE_SIZE: i64 = 20;
pub const MAX_PAGE_SIZE: i64 = 100;

/// Validates email format
pub fn validate_email(email: &str) -> bool {
    email.contains('@') && email.contains('.')
}

/// Validates username format (3-32 alphanumeric characters)
pub fn validate_username(username: &str) -> bool {
    username.len() >= 3
        && username.len() <= 32
        && username.chars().all(|c| c.is_alphanumeric() || c == '_' || c == '-')
}

/// Validates password strength (minimum 8 characters)
pub fn validate_password(password: &str) -> bool {
    password.len() >= 8
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_validate_email() {
        assert!(validate_email("user@example.com"));
        assert!(!validate_email("invalid-email"));
    }

    #[test]
    fn test_validate_username() {
        assert!(validate_username("john_doe"));
        assert!(!validate_username("ab"));  // too short
        assert!(!validate_username("user@name"));  // invalid chars
    }

    #[test]
    fn test_validate_password() {
        assert!(validate_password("secure_password_123"));
        assert!(!validate_password("short"));  // too short
    }
}
