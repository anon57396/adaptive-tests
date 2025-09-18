# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.2.x   | :white_check_mark: |
| < 0.1   | :x:                |

## Reporting a Vulnerability

If you discover a security vulnerability in Adaptive Tests, please follow these steps:

1. **DO NOT** open a public issue
2. Email security concerns to: jasonkempf@gmail.com
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

### Response Timeline

- **Acknowledgment**: Within 48 hours
- **Initial Assessment**: Within 1 week
- **Fix Development**: Depends on severity
  - Critical: 24-48 hours
  - High: 1 week
  - Medium/Low: Next release cycle

## Security Best Practices

When using Adaptive Tests:

- Never use dynamic discovery with untrusted code paths
- Validate discovered modules before executing
- Use signature constraints to limit discovery scope
- Keep the package updated to the latest version

## Known Security Considerations

- The discovery engine requires filesystem access
- Dynamic requiring of modules based on discovery results
- Ensure your test environment is isolated from production
