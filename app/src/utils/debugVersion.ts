// src/utils/debugVersion.ts
// Debug utility to test backend app status, version and maintenance checks
import { Platform } from 'react-native';
import { getAppConfig, getAppMaintenance, getAppVersions } from '@/api/appConfig';

/**
 * Debug function to manually check maintenance status
 */
export async function debugMaintenanceCheck(): Promise<boolean> {
  try {
    console.log('========== DEBUG MAINTENANCE CHECK ==========');
    console.log('Calling API: /api/v1/app/maintenance');
    const data = await getAppMaintenance();
    console.log('Maintenance data:', JSON.stringify(data, null, 2));
    console.log('Platform:', Platform.OS);
    const platformKey = Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web';
    console.log(`Value for ${Platform.OS}:`, data[platformKey]);
    console.log('============================================');
    return !data[platformKey];
  } catch (error: any) {
    console.error('❌ DEBUG maintenance check failed:', error);
    return false;
  }
}

/**
 * Debug function to manually check versions document
 */
export async function debugVersionCheck(): Promise<boolean> {
  try {
    console.log('========== DEBUG VERSION CHECK ==========');
    console.log('Calling API: /api/v1/app/versions');
    const data = await getAppVersions();
    console.log('Version data:', JSON.stringify(data, null, 2));
    console.log('Platform:', Platform.OS);
    const platformKey = Platform.OS === 'ios' ? 'ios' : 'android';
    console.log(`Required version for ${Platform.OS}:`, data[platformKey]);
    console.log('=========================================');
    return true;
  } catch (error: any) {
    console.error('❌ DEBUG version check failed:', error);
    return false;
  }
}

/**
 * Run all debug checks
 */
export async function runAllDebugChecks(): Promise<void> {
  console.log('\n\n========== STARTING ALL DEBUG CHECKS ==========\n');
  await debugMaintenanceCheck();
  console.log('\n');
  await debugVersionCheck();
  console.log('\n');
  try {
    const fullConfig = await getAppConfig();
    console.log('Combined Config:', JSON.stringify(fullConfig, null, 2));
  } catch (e) {
    console.error('Failed to get combined config:', e);
  }
  console.log('\n========== DEBUG CHECKS COMPLETE ==========\n\n');
}
