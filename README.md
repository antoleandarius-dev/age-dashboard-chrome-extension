# ⏱️ Real-Time Age Dashboard

A beautiful Chrome Extension that replaces your new tab page with a real-time age calculator featuring floating animations, life statistics, and personal tracking tools.

![Age Dashboard Preview](https://via.placeholder.com/800x400/1a1a2e/ffffff?text=Real-Time+Age+Dashboard)

## ✨ Features

### 🎯 **Core Functionality**
- **Real-time Age Display** - Shows your precise age in decimal years, updating every 100ms
- **Split Number Formatting** - Bold whole numbers with smaller decimal precision
- **Floating Circles Animation** - Three translucent circles that drift and rotate around your age
- **Starfield Background** - Animated stars radiating from center (toggleable)

### 📊 **Life Statistics**
- **Days Lived** - Total days since birth
- **Hours Lived** - Total hours counted
- **Birthday Countdown** - Days and hours until next birthday
- **Age Duration** - Days at your current age
- **Year Progress** - Visual progress bar showing % of current age year completed

### 🎨 **Themes & Customization**
- **Dark/Light Themes** - Toggle between beautiful color schemes
- **Minimal Design** - Clean, single-page layout with no scrolling
- **Responsive** - Works perfectly on all screen sizes
- **Settings Panel** - Comprehensive control over all features

### 🎯 **Milestone System**
- **Automatic Detection** - Celebrates major life milestones (10,000 days, 1 billion seconds, etc.)
- **Confetti Animations** - Beautiful celebrations when milestones are reached
- **Milestone History** - Track all your achievements
- **Next Milestone Preview** - See what's coming up

### ⚡ **Productivity Tools**
- **Todo List** - Simple task management with add/complete/delete
- **Clock Widget** - Live time with timezone display
- **Anniversary Tracker** - Manage special dates and events
- **Settings Management** - All controls in one convenient place

## 🚀 Installation

### **Method 1: Load Unpacked (Recommended)**

1. **Download the Extension**
   ```bash
   git clone https://github.com/antoleandarius-dev/age-dashboard-chrome-extension.git
   cd age-extension
   ```

2. **Open Chrome Extensions**
   - Navigate to `chrome://extensions/`
   - Enable **Developer mode** (toggle in top-right)

3. **Load the Extension**
   - Click **"Load unpacked"**
   - Select the `age-extension` folder
   - The extension will appear in your extensions list

4. **Set Your Date of Birth**
   - Open a new tab
   - Enter your date of birth when prompted
   - Enjoy your personalized age dashboard!

### **Method 2: Manual Setup**

1. Create a new folder for the extension
2. Copy all files (`manifest.json`, `index.html`, `style.css`, `script.js`)
3. Follow steps 2-4 from Method 1

## 🎮 Usage

### **First Time Setup**
1. Open a new tab in Chrome
2. Enter your date of birth
3. Click "Save & Start"
4. Your age will begin counting in real-time!

### **Navigation**
- **☰ Menu** (top-left) - Access settings and theme toggle
- **Settings** - Configure all widgets and preferences
- **Theme Toggle** - Switch between dark and light modes

### **Widgets**
- **Life Statistics** - Enable in settings to see detailed stats
- **Milestones** - Automatic milestone detection and celebrations
- **Clock** - Live time display in top-right corner
- **Todo List** - Task management on the left side

## ⚙️ Settings

Access settings via the **☰** menu button:

### **Widgets**
- ☐ Show Life Statistics
- ☐ Show Milestones  
- ☐ Show Clock
- ☐ Show Todo List
- ☐ Show Anniversaries

### **Appearance**
- ☐ Animated Starfield Background

### **Anniversaries**
- Add special dates and events
- Manage existing anniversaries
- Delete unwanted entries

### **Account**
- Change Date of Birth
- Reset all data

## 🎨 Customization

### **Themes**
- **Dark Theme** (Default) - Deep blue background with white text
- **Light Theme** - Soft gray background with dark text
- **Auto Theme** - Toggle between themes anytime

### **Animations**
- **Starfield** - Toggle the animated background
- **Floating Circles** - Three drifting, rotating circles
- **Smooth Transitions** - All elements animate smoothly

### **Layout**
- **Minimal Design** - Everything fits on one screen
- **No Scrolling** - Single-page experience
- **Responsive** - Adapts to any screen size

## 📱 Mobile Support

The extension is fully responsive and works on:
- Desktop Chrome
- Mobile Chrome (with simplified layout)
- Tablet devices

On mobile, some widgets are hidden to maintain the single-page design.

## 🔧 Technical Details

### **Files Structure**
```
age-extension/
├── manifest.json          # Extension configuration (Manifest V3)
├── index.html             # Main HTML structure
├── style.css              # Styling and animations
├── script.js              # Core functionality
└── README.md              # This file
```

### **Storage**
- Uses `chrome.storage.local` for all data persistence
- Stores: DOB, settings, todos, anniversaries, milestone history
- No external dependencies or API calls

### **Performance**
- Age updates every 100ms for precision
- Starfield animation runs at 60 FPS
- Minimal CPU usage with optimized animations
- All data stored locally (no internet required)

## 🎯 Milestones Tracked

The extension automatically celebrates these life milestones:

- **1,000 Days** - First major milestone
- **5,000 Days** - Significant life progress
- **10,000 Days** - Major life achievement
- **15,000 Days** - Advanced milestone
- **20,000 Days** - Exceptional achievement
- **100,000 Hours** - Time milestone
- **250,000 Hours** - Major time achievement
- **500,000 Hours** - Significant time milestone
- **1,000,000 Hours** - Exceptional time achievement
- **1 Billion Seconds** - Cosmic time milestone
- **2 Billion Seconds** - Advanced cosmic milestone

## 🛠️ Development

### **Local Development**
1. Clone the repository
2. Make your changes
3. Reload the extension in `chrome://extensions/`
4. Test in a new tab

### **File Structure**
- `manifest.json` - Chrome extension configuration
- `index.html` - HTML structure and layout
- `style.css` - CSS styling and animations
- `script.js` - JavaScript functionality

### **Key Features Implementation**
- **Real-time Updates** - `setInterval()` for age calculation
- **Animations** - CSS keyframes and JavaScript canvas
- **Storage** - Chrome storage API for persistence
- **Event Handling** - Modern JavaScript event delegation

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

### **How to Contribute**
1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 🐛 Issues

If you find a bug or have a feature request, please open an issue on GitHub.

## 📞 Support

For support, please open an issue on GitHub or contact the maintainers.

## 🎉 Acknowledgments

- Inspired by the beauty of time and the precision of mathematics
- Built with modern web technologies
- Designed for a mindful, productive browsing experience

---

**Made with ❤️ for those who appreciate the beauty of time**

*Every second counts, and now you can see exactly how many you've lived!*
