# Simnote 📝

A modern, beautiful journaling application built with Electron that combines functionality with stunning visual aesthetics.

![Simnote Logo](img/logo.png)

## ✨ Features

- **Beautiful Animated Backgrounds** - Choose from multiple stunning themes including Dark Sakura, Aurora, Fireflies, and Lavender Breeze
- **Distraction-Free Writing** - Clean, minimal interface designed for focused journaling
- **Mood Tracking** - Track your emotions with an intuitive mood slider and emoji system
- **Template System** - Get started quickly with guided prompts and templates
- **Customizable Experience** - Adjust font size, font family, and themes to your preference
- **Secure Local Storage** - All your entries are stored locally and securely on your device
- **Cross-Platform** - Available for Windows, macOS, and Linux

## 🎨 Themes

Simnote comes with 7 beautiful themes:

- **Dark Sakura** - Elegant dark theme with sakura petals animation
- **Light Sakura** - Light theme with gentle sakura animations
- **Plain Dark** - Minimalist dark theme
- **Plain White** - Clean light theme
- **Aurora** - Mesmerizing aurora borealis effects
- **Fireflies** - Magical fireflies dancing in the night
- **Lavender Breeze** - Soothing lavender theme with gentle animations

## 🚀 Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/simnote.git
cd simnote
```

2. Install dependencies:
```bash
npm install
```

3. Start the application:
```bash
npm start
```

### Building for Distribution

To build the application for your platform:

```bash
# Build for current platform
npm run dist

# Package for Windows
npm run pack
```

## 📁 Project Structure

```
simnote/
├── css/                    # Stylesheets
│   ├── base.css           # Base styles
│   ├── core.css           # Core component styles
│   ├── animations/        # Animation-specific styles
│   ├── components/        # UI component styles
│   └── panels/            # Panel-specific styles
├── js/                    # JavaScript modules
│   ├── animators/         # Animation controllers
│   ├── components/        # UI components
│   ├── core/             # Core application logic
│   ├── electron/         # Electron main process
│   ├── managers/         # Data and state managers
│   └── utils/            # Utility functions
├── img/                  # Images and assets
├── resources/            # Additional resources
├── ui/                   # UI templates and components
└── index.html           # Main application entry point
```

## 🎯 Usage

### Creating Your First Entry

1. **Launch Simnote** - The app opens with a beautiful splash screen
2. **Set Your Mood** - Use the mood slider to reflect your current emotional state
3. **Choose a Template** - Select from guided prompts or start with a blank entry
4. **Write Your Entry** - Use the distraction-free editor to write your thoughts
5. **Save and Organize** - Your entries are automatically saved and organized by date

### Customizing Your Experience

- **Theme Selection** - Click the settings gear (⚙️) to access theme options
- **Font Customization** - Adjust font size and family in the settings panel
- **Background Animations** - Each theme includes unique animated backgrounds

### Managing Your Entries

- **View Past Entries** - Navigate through your journal history in the journal panel
- **Edit Entries** - Click on any past entry to edit or update it
- **Mood Tracking** - View your emotional patterns over time with mood indicators

## 🔧 Development

### Tech Stack

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Desktop Framework**: Electron
- **Build Tools**: electron-builder, electron-packager
- **Animations**: Custom CSS animations and JavaScript animators

### Key Components

- **PanelManager** - Handles navigation between different app panels
- **EditorManager** - Manages the rich text editing experience
- **StorageManager** - Handles local data persistence
- **BackgroundAnimator** - Orchestrates theme-specific animations
- **MoodEmojiMapper** - Maps mood values to appropriate emojis

### Environment Variables

Create a `.env` file in the project root for configuration:

```env
# Add any environment-specific configurations here
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details on how to get started.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🐛 Bug Reports & Feature Requests

If you encounter any issues or have suggestions for new features, please create an issue on our GitHub repository.

## 🙏 Acknowledgments

- Thanks to all contributors who help make Simnote better
- Special thanks to the Electron community for their excellent documentation
- Inspiration from various journaling and note-taking applications

## 📞 Support

For support, questions, or feedback, please:
- Open an issue on GitHub
- Check the in-app manual (📘 button)
- Review the documentation

---

**Happy Journaling!** ✨

*Made with ❤️ for mindful writing and reflection*
