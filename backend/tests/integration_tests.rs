#[cfg(test)]
mod tests {
    use super::super::*;

    #[test]
    fn test_health_check_response() {
        let response = models::HealthResponse {
            status: "ok".to_string(),
            timestamp: chrono::Utc::now().to_rfc3339(),
        };
        assert_eq!(response.status, "ok");
    }

    #[test]
    fn test_api_response_creation() {
        let data = models::HealthResponse {
            status: "ok".to_string(),
            timestamp: chrono::Utc::now().to_rfc3339(),
        };
        let response = models::ApiResponse::ok(data);
        assert!(response.success);
    }

    #[test]
    fn test_register_request_validation() {
        let req = models::RegisterRequest {
            email: "test@example.com".to_string(),
            username: "testuser".to_string(),
            password: "password123".to_string(),
        };
        assert!(!req.email.is_empty());
        assert!(!req.username.is_empty());
        assert!(!req.password.is_empty());
    }
}
