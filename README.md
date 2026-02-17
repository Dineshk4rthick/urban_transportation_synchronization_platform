# UTSP Reporter

**Urban Transportation Synchronization Platform Reporter** - A React Native mobile app for commuters to submit real-time ground-level transport reports.

## 📱 Overview

UTSP Reporter empowers commuters to report transport delays, conditions, and observations with photo evidence, GPS tracking, and real-time leaderboards. Help improve urban transit by contributing data from your area.

## ✨ Features

- **📸 Photo Reports** - Capture transport conditions with camera or gallery images
- **📍 GPS Tracking** - Automatic location capture with reverse geocoding to place names
- **🗺️ Live Map** - Interactive map showing your current location
- **🏆 Real-time Leaderboard** - See top contributors ranked by report submissions
- **👤 User Profiles** - Track your points and submission history
- **🔐 Firebase Authentication** - Secure email/password login and signup
- **☁️ Real-time Database** - All data synced via Firebase Realtime Database
- **🎨 Modern UI** - Glassmorphism design with warm gradient theme

## 🛠️ Tech Stack

- **Framework**: React Native with Expo SDK 54
- **Backend**: Firebase (Realtime Database + Authentication)
- **State Management**: React Hooks
- **Navigation**: React Navigation v7
- **Maps**: react-native-maps
- **Location**: expo-location with reverse geocoding
- **Image Handling**: expo-image-picker + expo-image-manipulator
- **Styling**: React Native StyleSheet with LinearGradient

## 📦 Dependencies

```json
{
  "expo": "~54.0.0",
  "react": "18.3.1",
  "react-native": "0.76.5",
  "firebase": "latest",
  "@react-navigation/native": "^7.0.0",
  "@react-navigation/native-stack": "^7.0.0",
  "expo-image-picker": "~17.0.0",
  "expo-location": "~19.0.0",
  "expo-image-manipulator": "~14.0.0",
  "expo-linear-gradient": "latest",
  "react-native-maps": "latest",
  "@react-native-async-storage/async-storage": "latest",
  "react-native-get-random-values": "latest",
  "uuid": "^13.0.0"
}
```

## 🚀 Installation

### Prerequisites

- Node.js 18+ and npm
- Expo CLI (`npm install -g expo-cli`)
- Android Studio or Xcode (for native development)
- Firebase project with Realtime Database and Authentication enabled

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/Dineshk4rthick/urban_transportation_synchronization_platform.git
   cd urban_transportation_synchronization_platform/utsp-reporter
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Firebase**
   - Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
   - Enable **Realtime Database** (set rules to test mode for development)
   - Enable **Authentication** → Email/Password sign-in method
   - Download `google-services.json` for Android
   - Update `src/config/firebase.js` with your Firebase config

4. **Run the app**
   ```bash
   npx expo start
   ```
   - Press `a` for Android emulator
   - Press `i` for iOS simulator
   - Scan QR code with Expo Go app on your physical device

## 📁 Project Structure

```
utsp-reporter/
├── App.js                      # Root component with navigation
├── index.js                    # Entry point with polyfills
├── app.json                    # Expo configuration
├── package.json                # Dependencies
├── google-services.json        # Firebase Android config
├── src/
│   ├── config/
│   │   ├── firebase.js         # Firebase initialization
│   │   └── geocode.js          # Reverse geocoding utility
│   └── screens/
│       ├── LoginScreen.js      # Email/password authentication
│       ├── HomeScreen.js       # Map + user info + quick actions
│       ├── ReportScreen.js     # Submit new report form
│       ├── ReportsListScreen.js # View all submitted reports
│       ├── LeaderboardScreen.js # Real-time user rankings
│       └── ProfileScreen.js    # User profile + edit + logout
└── assets/                     # Images and icons
```

## 🔥 Firebase Structure

### Realtime Database Schema

```json
{
  "users": {
    "<uid>": {
      "name": "User Name",
      "email": "user@example.com",
      "city": "Chennai",
      "phone": "+91XXXXXXXXXX",
      "createdAt": "2026-02-17T10:00:00.000Z"
    }
  },
  "reports": {
    "<reportId>": {
      "reportId": "uuid-v4",
      "timestamp": "2026-02-17T10:30:00.000Z",
      "latitude": 13.262073,
      "longitude": 80.028059,
      "placeName": "Amrita Vishwa Vidyapeetham, Chennai",
      "estimatedTimeText": "15 min delay",
      "comment": "Heavy traffic at signal",
      "photoPath": "file://...",
      "anonymousUserId": "<uid>",
      "appVersion": "1.0.0"
    }
  }
}
```

### Security Rules (Development)

```json
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```

**⚠️ Important**: Update rules for production to restrict access appropriately.

## 🎨 Design System

### Color Palette
- **Primary**: `#E8922A` (Orange accent)
- **Background Gradient**: `#f0eae6` → `#f5e6da` → `#fce4cc`
- **Glass Cards**: `rgba(255,255,255,0.15-0.22)`
- **Text Dark**: `#1a1a2e`
- **Text Muted**: `#a09080`

### Typography
- **Headers**: Inter/SF Pro, 900 weight
- **Body**: Inter/SF Pro, 600-700 weight
- **Labels**: 11-14px, uppercase tracking

## 📱 Screens

1. **Login/Signup** - Email/password authentication with Firebase
2. **Home** - Live map + current location + user stats + quick actions
3. **Report** - Submit new report (photo, GPS, place, delay, comment)
4. **Reports List** - View all submitted reports with pull-to-refresh
5. **Leaderboard** - Real-time rankings by report count (10 points/report)
6. **Profile** - View/edit user info, recent submissions, logout

## 🏆 Scoring System

- **10 points** per report submitted
- Real-time leaderboard updates when new reports are added
- Users ranked by total score (descending)

## 🐛 Known Issues

- Place name fetching may take a few seconds depending on network
- Expo Location reverse geocoding format varies by region
- Image compression quality set to 0.6 (configurable in ReportScreen.js)

## 🔒 Security Considerations

- Photos stored locally on device (not uploaded to Firebase)
- User UID used as `anonymousUserId` for report linking
- Auth persistence via AsyncStorage
- Enable Firebase Security Rules before production deployment

## 📄 License

MIT License - feel free to use this project for learning and development.

## 👨‍💻 Author

**Dinesh Karthick**
- GitHub: [@Dineshk4rthick](https://github.com/Dineshk4rthick)
- Repository: [urban_transportation_synchronization_platform](https://github.com/Dineshk4rthick/urban_transportation_synchronization_platform)

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](https://github.com/Dineshk4rthick/urban_transportation_synchronization_platform/issues).

## 📧 Support

For support or questions, please open an issue on GitHub.

---

**Built with ❤️ using React Native & Expo**
