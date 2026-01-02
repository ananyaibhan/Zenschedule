import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { useAuth } from '../../hooks/useAuth';
import { useOnboarding } from '../../hooks/useOnboarding';
import { colors } from '../../styles/colors';
import { commonStyles } from '../../styles/commonStyles';

const SettingsScreen = () => {
  const { user, logout } = useAuth();
  const { resetOnboarding } = useOnboarding();

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          onPress: logout,
          style: 'destructive',
        },
      ]
    );
  };
  const handleResetOnboarding = () => {
    Alert.alert(
      'Reset Onboarding',
      'This will reset all your connections and preferences. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          onPress: () => {
            resetOnboarding();
            Alert.alert('Success', 'Onboarding has been reset');
          },
          style: 'destructive',
        },
      ]
    );
  };

  return (
    <SafeAreaView style={commonStyles.safeArea} edges={['bottom']}>
      <ScrollView style={commonStyles.container} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Settings</Text>
        </View>

        <Card style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </Text>
          </View>
          <Text style={styles.name}>{user?.name}</Text>
          <Text style={styles.email}>{user?.email}</Text>
        </Card>

        <Text style={styles.sectionTitle}>Connections</Text>
        <Card>
          <SettingRow
            icon="📅"
            title="Google Calendar"
            subtitle="Connected"
            onPress={() => {}}
          />
          <View style={commonStyles.divider} />
          <SettingRow
            icon="📝"
            title="Notion"
            subtitle="Connected"
            onPress={() => {}}
          />
          <View style={commonStyles.divider} />
          <SettingRow
            icon="🎵"
            title="Spotify"
            subtitle="Connected"
            onPress={() => {}}
          />
        </Card>

        <Text style={styles.sectionTitle}>Preferences</Text>
        <Card>
          <SettingRow
            icon="⏰"
            title="Working Hours"
            subtitle="9:00 AM - 6:00 PM"
            onPress={() => {}}
          />
          <View style={commonStyles.divider} />
          <SettingRow
            icon="🔔"
            title="Notifications"
            subtitle="Enabled"
            onPress={() => {}}
          />
          <View style={commonStyles.divider} />
          <SettingRow
            icon="☕"
            title="Break Preferences"
            subtitle="Meditation, Walking, Stretching"
            onPress={() => {}}
          />
        </Card>

        <Text style={styles.sectionTitle}>About</Text>
        <Card>
          <SettingRow
            icon="📖"
            title="Help & Support"
            onPress={() => {}}
          />
          <View style={commonStyles.divider} />
          <SettingRow
            icon="🔒"
            title="Privacy Policy"
            onPress={() => {}}
          />
          <View style={commonStyles.divider} />
          <SettingRow
            icon="📋"
            title="Terms of Service"
            onPress={() => {}}
          />
          <View style={commonStyles.divider} />
          <SettingRow
            icon="ℹ️"
            title="Version"
            subtitle="1.0.0"
            onPress={() => {}}
          />
        </Card>

        <Button
          title="Reset Onboarding"
          onPress={handleResetOnboarding}
          variant="outline"
          style={styles.resetButton}
        />

        <Button
          title="Logout"
          onPress={handleLogout}
          style={styles.logoutButton}
        />

        <Text style={styles.footer}>Made with ❤️ for your wellbeing</Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const SettingRow = ({ icon, title, subtitle, onPress }: any) => (
  <TouchableOpacity style={styles.settingRow} onPress={onPress}>
    <View style={styles.settingLeft}>
      <Text style={styles.settingIcon}>{icon}</Text>
      <View style={styles.settingText}>
        <Text style={styles.settingTitle}>{title}</Text>
        {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
      </View>
    </View>
    <Text style={styles.arrow}>›</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  profileCard: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.text.inverse,
  },
  name: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 12,
    marginTop: 8,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    fontSize: 24,
    marginRight: 16,
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    color: colors.text.primary,
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 13,
    color: colors.text.secondary,
  },
  arrow: {
    fontSize: 24,
    color: colors.text.disabled,
  },
  resetButton: {
    marginTop: 24,
  },
  logoutButton: {
    marginTop: 12,
    backgroundColor: colors.error,
  },
  footer: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
    marginTop: 32,
  },
});

export default SettingsScreen;