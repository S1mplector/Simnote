# Contributing to Simnote

Thank you for your interest in contributing to Simnote! 🎉 We welcome contributions from everyone, whether you're fixing bugs, adding features, improving documentation, or suggesting new ideas.

## 🚀 Quick Start

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/yourusername/simnote.git
   cd simnote
   ```
3. **Install dependencies**:
   ```bash
   npm install
   ```
4. **Start the development server**:
   ```bash
   npm start
   ```

## 📋 How to Contribute

### 🐛 Reporting Bugs

Before creating a bug report, please check the existing issues to avoid duplicates.

**To report a bug:**
1. Open a new issue using the bug report template
2. Include a clear, descriptive title
3. Provide detailed steps to reproduce the bug
4. Include your operating system, Node.js version, and Simnote version
5. Add screenshots if applicable

**Example bug report:**
```
Title: Theme selector dropdown not working on macOS

Description: When clicking the theme dropdown in settings, the list doesn't appear.

Steps to reproduce:
1. Open Simnote
2. Click settings gear (⚙️)
3. Click on theme dropdown
4. Expected: dropdown list appears
5. Actual: nothing happens

Environment:
- macOS 13.0
- Node.js 18.15.0
- Simnote 0.1.0
```

### 💡 Suggesting Features

We love feature suggestions! To suggest a new feature:

1. Open a new issue with the feature request template
2. Provide a clear description of the feature
3. Explain why this feature would be valuable
4. Include mockups or examples if possible

### 🔨 Code Contributions

#### Branch Naming Convention

Use descriptive branch names:
- `feature/new-theme-system`
- `bugfix/mood-slider-alignment`
- `docs/update-readme`
- `refactor/storage-manager`

#### Making Changes

1. **Create a new branch** from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes** following our coding standards (see below)

3. **Test your changes** thoroughly:
   ```bash
   npm start
   ```

4. **Commit your changes** with clear, descriptive messages:
   ```bash
   git commit -m "Add new lavender theme with petal animations"
   ```

5. **Push to your fork**:
   ```bash
   git push origin feature/your-feature-name
   ```

6. **Create a pull request** on GitHub

#### Pull Request Guidelines

- Use a clear, descriptive title
- Include a detailed description of your changes
- Reference any related issues (`Fixes #123`)
- Include screenshots for UI changes
- Ensure all tests pass
- Update documentation if necessary

## 📝 Coding Standards

### JavaScript

- Use ES6+ features when appropriate
- Follow consistent naming conventions:
  - `camelCase` for variables and functions
  - `PascalCase` for classes
  - `UPPER_SNAKE_CASE` for constants
- Use meaningful variable and function names
- Add JSDoc comments for complex functions
- Keep functions small and focused

**Example:**
```javascript
/**
 * Animates the background based on the selected theme
 * @param {string} themeName - The name of the theme to animate
 * @param {Object} options - Animation options
 */
class BackgroundAnimator {
  constructor(themeName, options = {}) {
    this.themeName = themeName;
    this.options = { duration: 3000, ...options };
  }

  startAnimation() {
    // Implementation here
  }
}
```

### CSS

- Use BEM methodology for class naming
- Group related styles together
- Use CSS custom properties for theme variables
- Keep selectors specific but not overly complex
- Comment complex animations or layouts

**Example:**
```css
/* Theme-specific background animations */
.background-animator {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: -1;
}

.background-animator--sakura {
  background: linear-gradient(135deg, #2d1b69 0%, #11027c 100%);
}

.background-animator__petal {
  position: absolute;
  opacity: 0.8;
  animation: sakura-fall 8s linear infinite;
}
```

### HTML

- Use semantic HTML5 elements
- Include appropriate ARIA labels for accessibility
- Keep markup clean and well-indented
- Use data attributes for JavaScript hooks

## 🎨 Adding New Themes

To add a new theme:

1. **Create theme files**:
   ```
   css/animations/your-theme.css
   js/animators/yourThemeAnimator.js
   js/animators/yourThemeSplashAnimator.js
   ```

2. **Register the theme** in `js/core/themeSelector.js`

3. **Add theme preview** in the settings dropdown

4. **Test all theme transitions** and animations

5. **Update documentation** with the new theme

## 🧪 Testing

Before submitting your contribution:

1. **Manual testing**:
   - Test on your target platform (Windows/macOS/Linux)
   - Try different themes and animations
   - Test mood tracking functionality
   - Verify entry saving and loading

2. **Cross-platform testing** (if possible):
   - Test on multiple operating systems
   - Verify Electron packaging works

3. **Performance testing**:
   - Check for memory leaks with animations
   - Ensure smooth performance with multiple entries

## 🏗️ Project Architecture

### Core Components

- **Managers**: Handle data, state, and business logic
- **Animators**: Control theme-specific animations
- **Components**: Reusable UI elements
- **Utils**: Helper functions and utilities

### Data Flow

1. User interactions → Managers
2. Managers → Update state and notify components
3. Components → Render UI updates
4. Animators → Handle visual effects

### File Organization

- Keep related files together
- Use descriptive file names
- Maintain consistent module structure
- Export/import modules clearly

## 🔐 Security Guidelines

- Never commit sensitive data (API keys, passwords)
- Validate all user inputs
- Keep Electron security best practices in mind
- Use `contextIsolation: true` in Electron windows

## 📚 Documentation

When adding new features:

1. Update the README if needed
2. Add JSDoc comments to functions
3. Update the in-app manual if UI changes
4. Include code examples for complex features

## 🎯 Areas for Contribution

We especially welcome contributions in these areas:

### 🎨 Themes & Animations
- New animated backgrounds
- Theme transition effects
- Seasonal themes
- Performance optimizations

### 📝 Writing Features
- Rich text formatting options
- Writing statistics
- Export functionality
- Template system improvements

### 📊 Analytics & Insights
- Mood tracking visualizations
- Writing habit analytics
- Entry statistics
- Data export options

### 🔧 Technical Improvements
- Performance optimizations
- Code refactoring
- Test coverage
- Build process improvements

### 🌐 Accessibility
- Screen reader support
- Keyboard navigation
- Color contrast improvements
- Font size accessibility

## 📞 Getting Help

If you need help with contributing:

1. Check existing issues and discussions
2. Open a new issue with the "question" label
3. Join our community discussions
4. Review the existing codebase for patterns

## 🙏 Recognition

All contributors will be recognized in our README and release notes. We appreciate every contribution, no matter how small!

## 📄 License

By contributing to Simnote, you agree that your contributions will be licensed under the same license as the project (MIT License).

---

**Thank you for contributing to Simnote!** 🌟

Your contributions help make journaling more beautiful and accessible for everyone.
