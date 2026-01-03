# Genealogy Explorer 🌳

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Wikibase Cloud](https://img.shields.io/badge/Powered%20by-Wikibase%20Cloud-blue)](https://wikibase.cloud)
[![Live Demo](https://img.shields.io/badge/Demo-Live-brightgreen)](https://masssly.github.io/genealogy)

A collaborative genealogy visualization tool that connects to your Wikibase Cloud instance to display family trees, relationships, and biographical information in a beautiful, responsive interface.

## ✨ Features

- **🔍 Search & Filter**: Instantly search through family members by name, ID, or aliases
- **📱 Responsive Design**: Works perfectly on desktop, tablet, and mobile devices
- **🖼️ Smart Image Loading**: Shows Commons images first, falls back to local assets
- **📅 Life Events Display**: Birth/death dates with calculated ages and formatted dates
- **👥 Family Navigation**: Preview family members without losing your place
- **🌳 Tree Visualization**: View family relationships and hierarchies
- **🔄 Real-time Updates**: Refresh data directly from your Wikibase instance
- **📊 Statistics Dashboard**: Quick overview of your genealogy data

## 🚀 Live Demo

Visit the live deployment: [https://masssly.github.io/genealogy](https://masssly.github.io/genealogy)

## 🛠️ Quick Start

### Option 1: Simple Deployment (Recommended)

1. **Fork this repository**
2. **Edit the configuration** in `app.js`:
   ```javascript
   // Update this line with your Wikibase instance
   const WIKIBASE_SPARQL_ENDPOINT = 'https://YOUR_INSTANCE.wikibase.cloud/query/sparql';
   ```
3. **Enable GitHub Pages** in your repository settings
4. **Your site is live!** 🎉

### Option 2: Local Development

```bash
# Clone the repository
git clone https://github.com/Masssly/genealogy.git
cd genealogy

# Run a local server
python3 -m http.server 8080

# Open your browser to:
# http://localhost:8080
```

## 📁 Project Structure

```
genealogy/
├── index.html          # Main HTML file
├── styles.css          # Custom styles
├── app.js              # Main application logic
├── assets/             # Local images (optional)
│   ├── Q1.jpg
│   ├── Q2.jpg
│   └── ...
├── README.md           # This file
└── .github/
    └── workflows/
        └── deploy.yml  # GitHub Pages deployment
```

## ⚙️ Configuration

### Wikibase Setup

1. **Create a Wikibase Cloud instance** at [wikibase.cloud](https://wikibase.cloud)
2. **Add your genealogy data** using the following property structure:
   - `P3`: Instance of (use Q4 for Human)
   - `P4`: Father
   - `P5`: Mother
   - `P21`: Birth date
   - `P23`: Death date
   - `P1`: Image (link to Wikimedia Commons)
   - `P20`: Occupation
   - `P19`: Residence

3. **Update the SPARQL endpoint** in `app.js`:
   ```javascript
   const WIKIBASE_SPARQL_ENDPOINT = 'https://masssly.wikibase.cloud/query/sparql';
   ```

### Local Images

Add local images to the `assets/` folder using the naming convention `Q{ID}.jpg`:
- `assets/Q1.jpg` for person Q1
- `assets/Q2.jpg` for person Q2

## 🎨 Customization

### Change Colors
Edit `styles.css` to match your family's colors:
```css
:root {
    --primary-color: #d97706; /* Amber */
    --secondary-color: #92400e;
    --accent-color: #3b82f6;
}
```

### Add Custom Features
The modular code makes it easy to add new features:

```javascript
// Example: Add a timeline view
function showTimeline(person) {
    // Your timeline implementation
}
```

## 🔧 Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| **No data loading** | Check Wikibase connection in browser console |
| **Images not showing** | Verify Commons URLs or add local images to `assets/` |
| **Search not working** | Clear browser cache or check JavaScript console |
| **Mobile layout issues** | Test with different screen sizes in dev tools |

### Debug Mode
Enable console logging by uncommenting debug lines in `app.js`:
```javascript
console.log('Debug:', variable);
```

## 🤝 Contributing

We welcome contributions! Here's how:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Commit your changes**: `git commit -m 'Add amazing feature'`
4. **Push to the branch**: `git push origin feature/amazing-feature`
5. **Open a Pull Request**

### Development Guidelines
- Write clear commit messages
- Update documentation for new features
- Test on multiple browsers
- Follow existing code style

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Wikibase Cloud** for providing the data infrastructure
- **Tailwind CSS** for the utility-first CSS framework
- **React** and **JavaScript** community for inspiration
- **All contributors** who help improve this project

## 📞 Support

- **Documentation**: [Project Wiki](https://github.com/Masssly/genealogy/wiki)
- **Issues**: [GitHub Issues](https://github.com/Masssly/genealogy/issues)
- **Discussions**: [GitHub Discussions](https://github.com/Masssly/genealogy/discussions)

---

**Built with ❤️ for family history preservation**

*Keep your family stories alive for generations to come*
