/**
 * Sanitize secrets, passwords, tokens, and hashes from audit log payloads
 */
export function sanitizeAuditDetails(details: any): any {
  if (!details) return details;
  
  if (typeof details === 'string') {
    // Regex scrub sensitive keys
    return details
      .replace(/"(password|password_hash|token|access_token|secret_key|secret|current_password|new_password)"\s*:\s*"[^"]*"/gi, '"$1": "[REDACTED]"')
      .replace(/'(password|password_hash|token|access_token|secret_key|secret|current_password|new_password)'\s*:\s*'[^']*'/gi, "'$1': '[REDACTED]'");
  }

  if (typeof details === 'object') {
    try {
      const sanitized = JSON.parse(JSON.stringify(details));
      const redactKeys = ['password', 'password_hash', 'token', 'access_token', 'secret', 'secret_key', 'current_password', 'new_password'];
      
      const scrub = (obj: any) => {
        if (!obj || typeof obj !== 'object') return;
        for (const k of Object.keys(obj)) {
          if (k.startsWith('$') || k.includes('.')) {
            delete obj[k];
          } else if (redactKeys.includes(k.toLowerCase())) {
            obj[k] = '[REDACTED]';
          } else if (typeof obj[k] === 'object') {
            scrub(obj[k]);
          }
        }
      };
      
      scrub(sanitized);
      return sanitized;
    } catch {
      return details;
    }
  }

  return details;
}

