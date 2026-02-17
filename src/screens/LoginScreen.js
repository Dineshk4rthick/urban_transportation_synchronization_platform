import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import { ref, set, get } from 'firebase/database';
import { auth, db } from '../config/firebase';

export default function LoginScreen() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAuth = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Missing Fields', 'Please enter email and password.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Weak Password', 'Password must be at least 6 characters.');
      return;
    }
    if (isSignUp && !name.trim()) {
      Alert.alert('Missing Name', 'Please enter your name.');
      return;
    }

    setLoading(true);
    try {
      if (isSignUp) {
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        // Save user profile to RTDB
        await set(ref(db, 'users/' + cred.user.uid), {
          name: name.trim(),
          email: email.trim(),
          city: city.trim() || '',
          phone: phone.trim() || '',
          createdAt: new Date().toISOString(),
        });
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      }
      // Navigation handled by auth state listener in App.js
    } catch (err) {
      console.log('Auth error:', err.code, err.message);
      let msg = err.message || 'Something went wrong. Please try again.';
      if (err.code === 'auth/email-already-in-use') msg = 'This email is already registered. Try logging in.';
      else if (err.code === 'auth/invalid-email') msg = 'Please enter a valid email address.';
      else if (err.code === 'auth/user-not-found') msg = 'No account found with this email.';
      else if (err.code === 'auth/wrong-password') msg = 'Incorrect password.';
      else if (err.code === 'auth/invalid-credential') msg = 'Invalid email or password.';
      else if (err.code === 'auth/operation-not-allowed') msg = 'Email/Password sign-in is not enabled. Please enable it in Firebase Console → Authentication → Sign-in method.';
      else if (err.code === 'auth/network-request-failed') msg = 'Network error. Please check your internet connection.';
      else if (err.code === 'auth/too-many-requests') msg = 'Too many attempts. Please try again later.';
      else if (err.code === 'auth/configuration-not-found') msg = 'Firebase Auth is not configured. Enable Email/Password in Firebase Console → Authentication → Sign-in method.';
      Alert.alert('Error', msg);
    }
    setLoading(false);
  };

  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <LinearGradient colors={['#f0eae6', '#f5e6da', '#fce4cc']} style={s.gradient}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={s.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Logo */}
            <View style={s.logoWrap}>
              <Text style={s.logoEmoji}>🚌</Text>
              <Text style={s.logoTitle}>UTSP Reporter</Text>
              <Text style={s.logoSub}>Ground-level transport reporting</Text>
            </View>

            {/* Form Card */}
            <View style={s.card}>
              <Text style={s.cardTitle}>{isSignUp ? 'Create Account' : 'Welcome Back'}</Text>
              <Text style={s.cardSub}>
                {isSignUp ? 'Sign up to start reporting' : 'Log in to continue'}
              </Text>

              {isSignUp && (
                <TextInput
                  style={s.input}
                  placeholder="Full Name"
                  placeholderTextColor="#b0a090"
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                />
              )}

              <TextInput
                style={s.input}
                placeholder="Email"
                placeholderTextColor="#b0a090"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <TextInput
                style={s.input}
                placeholder="Password"
                placeholderTextColor="#b0a090"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />

              {isSignUp && (
                <>
                  <TextInput
                    style={s.input}
                    placeholder="City"
                    placeholderTextColor="#b0a090"
                    value={city}
                    onChangeText={setCity}
                  />
                  <TextInput
                    style={s.input}
                    placeholder="Phone Number"
                    placeholderTextColor="#b0a090"
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                  />
                </>
              )}

              <TouchableOpacity
                style={[s.btn, loading && s.btnDisabled]}
                onPress={handleAuth}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={s.btnText}>{isSignUp ? 'Sign Up' : 'Log In'}</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={s.switchBtn}
                onPress={() => setIsSignUp(!isSignUp)}
              >
                <Text style={s.switchText}>
                  {isSignUp
                    ? 'Already have an account? '
                    : "Don't have an account? "}
                  <Text style={s.switchTextBold}>
                    {isSignUp ? 'Log In' : 'Sign Up'}
                  </Text>
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  gradient: { flex: 1 },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingBottom: 40,
  },

  /* Logo */
  logoWrap: { alignItems: 'center', marginBottom: 36 },
  logoEmoji: { fontSize: 52, marginBottom: 8 },
  logoTitle: { fontSize: 28, fontWeight: '900', color: '#1a1a2e', letterSpacing: 0.5 },
  logoSub: { fontSize: 14, color: '#a09080', marginTop: 4 },

  /* Card */
  card: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 28,
    paddingVertical: 32,
    paddingHorizontal: 24,
  },
  cardTitle: { fontSize: 22, fontWeight: '800', color: '#1a1a2e', marginBottom: 4 },
  cardSub: { fontSize: 14, color: '#a09080', marginBottom: 24 },

  /* Inputs */
  input: {
    backgroundColor: 'rgba(255,255,255,0.45)',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 18,
    fontSize: 15,
    color: '#333',
    marginBottom: 14,
  },

  /* Button */
  btn: {
    backgroundColor: '#E8922A',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontSize: 17, fontWeight: '800' },

  /* Switch */
  switchBtn: { alignItems: 'center', marginTop: 20 },
  switchText: { fontSize: 14, color: '#888' },
  switchTextBold: { color: '#E8922A', fontWeight: '700' },
});
