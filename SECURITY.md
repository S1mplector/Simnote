# Security Policy

## Supported Versions

We actively support the following versions of Simnote with security updates:

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |

## Reporting a Vulnerability

We take security seriously. If you discover a security vulnerability, please report it responsibly.

### How to Report

1. **DO NOT** create a public GitHub issue for security vulnerabilities
2. **Email us directly** at: security@simnote.com (replace with actual email)
3. **Include the following information**:
   - Description of the vulnerability
   - Steps to reproduce the issue
   - Potential impact
   - Suggested fixes (if any)
   - Your contact information

### What to Expect

- **Acknowledgment**: We'll acknowledge your report within 48 hours
- **Investigation**: We'll investigate and assess the vulnerability
- **Updates**: We'll provide updates on our progress
- **Resolution**: We'll work to fix the issue and release a security update
- **Credit**: We'll credit you for responsible disclosure (if desired)

### Response Timeline

- **Critical vulnerabilities**: 24-48 hours
- **High-severity vulnerabilities**: 1-7 days
- **Medium/Low severity**: 1-4 weeks

## Security Best Practices

### For Users

1. **Keep Simnote Updated**
   - Always use the latest version
   - Enable automatic updates when available

2. **Protect Your Data**
   - Use strong passwords for your system
   - Keep your operating system updated
   - Use antivirus software

3. **Safe Usage**
   - Don't install Simnote from unofficial sources
   - Verify file integrity when downloading
   - Be cautious with file imports/exports

### For Developers

1. **Secure Development**
   - Follow Electron security best practices
   - Keep dependencies updated
   - Use secure coding practices

2. **Data Protection**
   - Encrypt sensitive data at rest
   - Validate all inputs
   - Use secure communication protocols

3. **Access Control**
   - Implement principle of least privilege
   - Use secure authentication methods
   - Regularly audit permissions

## Known Security Considerations

### Electron Security

Simnote is built with Electron and follows these security practices:

- **Context Isolation**: Enabled to prevent code injection
- **Node Integration**: Disabled in renderer processes
- **Preload Scripts**: Used for secure IPC communication
- **Content Security Policy**: Implemented to prevent XSS attacks

### Data Storage

- **Local Storage**: Entries are stored locally on your device
- **No Cloud Sync**: Data doesn't leave your device by default
- **File Permissions**: Entry files have restricted access permissions

### Third-Party Dependencies

- **Regular Updates**: Dependencies are regularly updated
- **Security Audits**: We use `npm audit` to check for vulnerabilities
- **Minimal Dependencies**: We keep third-party dependencies to a minimum

## Secure Configuration

### Recommended Settings

```javascript
// Secure BrowserWindow configuration
const mainWindow = new BrowserWindow({
  webPreferences: {
    nodeIntegration: false,          // Disable Node.js integration
    contextIsolation: true,          // Enable context isolation
    enableRemoteModule: false,       // Disable remote module
    allowRunningInsecureContent: false,
    experimentalFeatures: false,
    webSecurity: true,              // Enable web security
    preload: path.join(__dirname, 'preload.js')
  }
});
```

### Content Security Policy

```html
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self' 'unsafe-inline';
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  font-src 'self' https://fonts.gstatic.com;
  img-src 'self' data:;
  connect-src 'self';
">
```

## Vulnerability Disclosure Policy

### Scope

This security policy applies to:
- Simnote desktop application
- All official releases and builds
- Security issues in dependencies
- Configuration vulnerabilities

### Out of Scope

- Issues in third-party software not directly related to Simnote
- Physical security of user devices
- Social engineering attacks
- Issues requiring physical access to the device

### Responsible Disclosure

We believe in responsible disclosure and will:
- Work with security researchers to address vulnerabilities
- Provide credit for responsible disclosure
- Maintain confidentiality during the resolution process
- Coordinate public disclosure after fixes are available

## Security Updates

### Notification Methods

Security updates will be announced via:
- GitHub release notes
- Application update notifications
- Security advisories (for critical issues)

### Update Process

1. **Automatic Updates**: Enable automatic updates when available
2. **Manual Updates**: Check for updates regularly
3. **Security Patches**: Apply security patches immediately

## Contact Information

For security-related questions or reports:

- **Email**: security@simnote.com
- **GitHub**: Create a private security advisory
- **Response Time**: 48 hours for acknowledgment

## Compliance

Simnote aims to comply with:
- OWASP security guidelines
- Electron security best practices
- Industry-standard security practices

---

**Thank you for helping keep Simnote secure!** 🔒

Your responsible disclosure helps protect all our users.
