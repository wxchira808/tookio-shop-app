# Tookio Shop - Splash Screen & App Icon Setup Guide

This guide will help you add your custom splash screen and app icon to the Tookio Shop mobile app.

## 📁 Where to Place Your Images

All app images should be placed in the `/apps/mobile/assets/images/` directory:

```
apps/mobile/assets/images/
├── icon.png              # App icon (square)
├── adaptive-icon.png     # Android adaptive icon (square)
├── splash-icon.png       # Splash screen logo
└── favicon.png           # Web favicon
```

## 🎨 Image Requirements

### 1. App Icon (`icon.png`)
- **Size**: 1024x1024 pixels
- **Format**: PNG
- **Background**: Should include background (not transparent)
- **Usage**: iOS app icon, Android non-adaptive icon
- **Location**: `./assets/images/icon.png`

### 2. Android Adaptive Icon (`adaptive-icon.png`)
- **Size**: 1024x1024 pixels
- **Format**: PNG with transparency
- **Safe Zone**: Keep important content within center 66% (684x684px)
- **Background Color**: Set in `app.json` under `android.adaptiveIcon.backgroundColor`
- **Usage**: Modern Android devices
- **Location**: `./assets/images/adaptive-icon.png`

### 3. Splash Screen Icon (`splash-icon.png`)
- **Size**: 1000x1000 pixels recommended
- **Format**: PNG with transparency
- **Usage**: Displayed during app loading
- **Background**: Transparent (background color set in code)
- **Location**: `./assets/images/splash-icon.png`

### 4. Web Favicon (`favicon.png`)
- **Size**: 48x48 pixels
- **Format**: PNG
- **Usage**: Web browser tab icon
- **Location**: `./assets/images/favicon.png`

## ⚙️ Current Configuration

The splash screen is already configured in `app.json`:

```json
{
  "expo": {
    "name": "Tookio Shop",
    "icon": "./assets/images/icon.png",
    "splash": {
      "image": "./assets/images/splash-icon.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/images/adaptive-icon.png",
        "backgroundColor": "#ffffff"
      }
    }
  }
}
```

## 🚀 How to Add Your Custom Images

### Step 1: Prepare Your Images
1. Create your logo/icon following the size requirements above
2. Export in PNG format at the specified dimensions
3. For transparent backgrounds, save with alpha channel

### Step 2: Replace Default Images
Replace the placeholder images in `/apps/mobile/assets/images/` with your custom images:

```bash
cd apps/mobile/assets/images/

# Replace with your custom images
cp /path/to/your/icon.png ./icon.png
cp /path/to/your/adaptive-icon.png ./adaptive-icon.png
cp /path/to/your/splash-icon.png ./splash-icon.png
cp /path/to/your/favicon.png ./favicon.png
```

### Step 3: Customize Colors (Optional)
If you want to change the splash screen or adaptive icon background color, edit `app.json`:

```json
{
  "expo": {
    "splash": {
      "backgroundColor": "#YOUR_COLOR"  // e.g., "#357AFF"
    },
    "android": {
      "adaptiveIcon": {
        "backgroundColor": "#YOUR_COLOR"  // e.g., "#357AFF"
      }
    }
  }
}
```

### Step 4: Clear Cache and Restart
After replacing images, clear the cache and restart Expo:

```bash
# Clear Expo cache
npx expo start --clear

# Or
rm -rf node_modules/.cache
npx expo start
```

## 🎨 Design Tips

### For App Icon:
- Use simple, recognizable design
- Avoid thin lines (minimum 2-3px stroke)
- Test at small sizes (60x60px) to ensure clarity
- Use high contrast colors
- Include padding (about 10%) from edges

### For Splash Screen:
- Keep logo centered
- Use simple, clean design
- Match your brand colors
- Consider light/dark theme
- Test on different screen sizes

### For Adaptive Icon (Android):
- Keep important content in safe zone (center 66%)
- Outer 33% may be masked
- Use transparent PNG foreground
- Choose complementary background color

## 📱 Testing Your Images

### On iOS:
```bash
npx expo start
# Press 'i' to open iOS simulator
```

### On Android:
```bash
npx expo start
# Press 'a' to open Android emulator
# Or scan QR code with Expo Go on physical device
```

### On Device with Expo Go:
1. Install Expo Go on your phone
2. Run `npx expo start`
3. Scan the QR code
4. App will load with your custom splash screen and icon

## 🔧 Advanced: Custom Splash Screen Plugin

The current setup uses a simple centered icon. If you want a full-screen custom splash screen, you can:

1. Create a full-screen splash image (e.g., 1284x2778 for iPhone 14 Pro Max)
2. Update `app.json`:

```json
{
  "expo": {
    "splash": {
      "image": "./assets/images/splash.png",
      "resizeMode": "cover",  // or "contain"
      "backgroundColor": "#ffffff"
    }
  }
}
```

## 🐛 Troubleshooting

### Images not updating?
- Clear Expo cache: `npx expo start --clear`
- Delete and reinstall the app
- Check image file names match exactly
- Ensure images are in correct directory

### Icon looks blurry?
- Use higher resolution (1024x1024 minimum)
- Save as PNG, not JPG
- Don't upscale small images

### Splash screen not showing?
- Verify `splash-icon.png` exists
- Check `app.json` configuration
- Clear cache and restart
- Make sure image has sufficient contrast with background

## 📚 Additional Resources

- [Expo App Icon Guidelines](https://docs.expo.dev/develop/user-interface/splash-screen-and-app-icon/)
- [Expo Splash Screen API](https://docs.expo.dev/versions/latest/sdk/splash-screen/)
- [Android Adaptive Icons](https://developer.android.com/develop/ui/views/launch/icon_design_adaptive)

## ✅ Checklist

- [ ] Created `icon.png` (1024x1024px)
- [ ] Created `adaptive-icon.png` (1024x1024px with safe zone)
- [ ] Created `splash-icon.png` (1000x1000px recommended)
- [ ] Created `favicon.png` (48x48px)
- [ ] Placed all images in `apps/mobile/assets/images/`
- [ ] Updated `app.json` if needed (colors, resizeMode)
- [ ] Tested on iOS
- [ ] Tested on Android
- [ ] Cleared cache and verified changes

---

**Need help?** Check the Expo documentation or reach out for support!
