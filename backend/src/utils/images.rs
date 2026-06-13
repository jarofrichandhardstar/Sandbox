use std::io::Write;
use std::path::{Path, PathBuf};
use uuid::Uuid;

pub const UPLOAD_DIR: &str = "uploads/products";
pub const MAX_FILE_SIZE: usize = 5 * 1024 * 1024; // 5MB
pub const ALLOWED_FORMATS: &[&str] = &["image/jpeg", "image/png", "image/webp", "image/gif"];

/// Create uploads directory if it doesn't exist
pub fn ensure_upload_dir() -> crate::errors::Result<()> {
    let path = Path::new(UPLOAD_DIR);
    if !path.exists() {
        std::fs::create_dir_all(path).map_err(|e| {
            tracing::error!("Failed to create upload directory: {}", e);
            crate::errors::ApiError::InternalError
        })?;
    }
    Ok(())
}

/// Generate unique filename for uploaded image
pub fn generate_filename(original_filename: &str) -> String {
    let ext = Path::new(original_filename)
        .extension()
        .and_then(|s| s.to_str())
        .unwrap_or("jpg");
    
    format!("{}_{}.{}", Uuid::new_v4(), chrono::Utc::now().timestamp(), ext)
}

/// Validate file size
pub fn validate_file_size(size: usize) -> crate::errors::Result<()> {
    if size > MAX_FILE_SIZE {
        return Err(crate::errors::ApiError::BadRequest(
            format!("File size exceeds maximum allowed size of {} MB", MAX_FILE_SIZE / 1024 / 1024)
        ));
    }
    Ok(())
}

/// Validate MIME type
pub fn validate_mime_type(mime_type: &str) -> crate::errors::Result<()> {
    if !ALLOWED_FORMATS.contains(&mime_type) {
        return Err(crate::errors::ApiError::BadRequest(
            format!("File type not allowed. Allowed types: {:?}", ALLOWED_FORMATS)
        ));
    }
    Ok(())
}

/// Save uploaded file to disk
pub fn save_upload(filename: &str, data: &[u8]) -> crate::errors::Result<String> {
    let file_path = PathBuf::from(UPLOAD_DIR).join(filename);
    
    let mut file = std::fs::File::create(&file_path).map_err(|e| {
        tracing::error!("Failed to create file: {}", e);
        crate::errors::ApiError::InternalError
    })?;
    
    file.write_all(data).map_err(|e| {
        tracing::error!("Failed to write file: {}", e);
        crate::errors::ApiError::InternalError
    })?;

    tracing::info!("Image saved: {}", filename);
    Ok(format!("/api/images/{}", filename))
}

/// Delete uploaded file
pub fn delete_upload(filename: &str) -> crate::errors::Result<()> {
    let file_path = PathBuf::from(UPLOAD_DIR).join(filename);
    
    if file_path.exists() {
        std::fs::remove_file(&file_path).map_err(|e| {
            tracing::error!("Failed to delete file: {}", e);
            crate::errors::ApiError::InternalError
        })?;
        
        tracing::info!("Image deleted: {}", filename);
    }
    
    Ok(())
}

/// Extract filename from URL path
pub fn extract_filename_from_url(url: &str) -> Option<String> {
    url.split('/').last().map(|s| s.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_generate_filename() {
        let filename = generate_filename("photo.jpg");
        assert!(filename.ends_with(".jpg"));
        assert!(filename.contains('_'));
    }

    #[test]
    fn test_validate_file_size() {
        assert!(validate_file_size(1000).is_ok());
        assert!(validate_file_size(MAX_FILE_SIZE + 1).is_err());
    }

    #[test]
    fn test_validate_mime_type() {
        assert!(validate_mime_type("image/jpeg").is_ok());
        assert!(validate_mime_type("image/png").is_ok());
        assert!(validate_mime_type("image/webp").is_ok());
        assert!(validate_mime_type("text/plain").is_err());
        assert!(validate_mime_type("application/pdf").is_err());
    }

    #[test]
    fn test_extract_filename_from_url() {
        assert_eq!(
            extract_filename_from_url("/api/images/photo_123.jpg"),
            Some("photo_123.jpg".to_string())
        );
    }
}
