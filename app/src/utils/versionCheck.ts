// src/utils/versionCheck.ts
import { Platform } from 'react-native';
import {
  getAppConfig,
  getAppLinks,
  getAppMaintenance,
  getAppVersions,
  AppLinks as ApiAppLinks,
  AppConfigResponse,
} from '@/api/appConfig';

export interface VersionInfo {
  currentVersion: string;
  requiredVersion: string;
  updateRequired: boolean;
  updateUrl?: string;
}

export interface MaintenanceInfo {
  isUnderMaintenance: boolean;
  platform: 'ios' | 'android' | 'web';
}

export interface AppLinks {
  appleStore: string;
  playStore: string;
}

const DEFAULT_LINKS: AppLinks = {
  appleStore: 'https://apps.apple.com/app/saturnalia/id6738927814',
  playStore: 'https://play.google.com/store/apps/details?id=org.thapar.saturnalia',
};

/**
 * Compares two version strings (semantic versioning)
 * Returns:
 *  1 if v1 > v2
 *  0 if v1 === v2
 * -1 if v1 < v2
 */
export function compareVersions(v1: string, v2: string): number {
  const parts1 = (v1 || '0').split('.').map((p) => parseInt(p, 10) || 0);
  const parts2 = (v2 || '0').split('.').map((p) => parseInt(p, 10) || 0);

  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const part1 = parts1[i] || 0;
    const part2 = parts2[i] || 0;

    if (part1 > part2) return 1;
    if (part1 < part2) return -1;
  }

  return 0;
}

/**
 * Checks if the current app version meets the minimum required version
 * @param currentVersion - The current app version
 * @param minRequiredVersion - The minimum required version from backend
 * @returns true if update is required, false otherwise
 */
export function isUpdateRequired(
  currentVersion: string,
  minRequiredVersion: string
): boolean {
  return compareVersions(currentVersion, minRequiredVersion) < 0;
}

/**
 * Fetches app store links from backend API
 */
export async function fetchAppLinks(): Promise<AppLinks> {
  try {
    const data = await getAppLinks();
    return {
      appleStore: data?.appleStore || DEFAULT_LINKS.appleStore,
      playStore: data?.playStore || DEFAULT_LINKS.playStore,
    };
  } catch (error) {
    console.warn('[Version Check] Failed to fetch app links, using defaults:', error);
    return DEFAULT_LINKS;
  }
}

export async function getDeleteFlag(): Promise<boolean> {
  return false;
}

/**
 * Checks if the current platform is under maintenance
 */
export async function checkMaintenance(): Promise<MaintenanceInfo> {
  const currentPlatform = (Platform.OS as 'ios' | 'android' | 'web') || 'android';
  try {
    const data = (await getAppMaintenance()) as any;
    let isUnderMaintenance = false;

    if (currentPlatform === 'ios') {
      isUnderMaintenance = !!(data?.ios ?? data?.iOS ?? data?.IOS);
    } else if (currentPlatform === 'android') {
      isUnderMaintenance = !!(data?.android ?? data?.Android);
    } else {
      isUnderMaintenance = !!(data?.web ?? data?.Web);
    }

    return {
      isUnderMaintenance,
      platform: currentPlatform,
    };
  } catch (error) {
    console.warn('[Version Check] Failed to check maintenance status:', error);
    return {
      isUnderMaintenance: false,
      platform: currentPlatform,
    };
  }
}

/**
 * Fetches required version info from backend
 */
export async function fetchVersionInfo(
  currentVersion: string
): Promise<VersionInfo> {
  const currentPlatform = Platform.OS;
  try {
    const [versions, links] = await Promise.all([
      getAppVersions(),
      fetchAppLinks(),
    ]);

    const requiredVersion =
      currentPlatform === 'ios'
        ? versions?.ios || '1.0.0'
        : versions?.android || '1.0.0';

    const updateUrl =
      currentPlatform === 'ios' ? links.appleStore : links.playStore;

    const updateRequired = isUpdateRequired(currentVersion, requiredVersion);

    return {
      currentVersion,
      requiredVersion,
      updateRequired,
      updateUrl,
    };
  } catch (error) {
    console.warn('[Version Check] Failed to fetch version info:', error);
    return {
      currentVersion,
      requiredVersion: '1.0.0',
      updateRequired: false,
    };
  }
}

/**
 * Comprehensive app status check in one single network request
 */
export async function checkAppStatus(currentVersion: string): Promise<{
  versionInfo: VersionInfo;
  maintenanceInfo: MaintenanceInfo;
  appLinks: AppLinks;
}> {
  const currentPlatform = (Platform.OS as 'ios' | 'android' | 'web') || 'android';

  try {
    const config: AppConfigResponse = await getAppConfig();

    const links: AppLinks = {
      appleStore: config.links?.appleStore || DEFAULT_LINKS.appleStore,
      playStore: config.links?.playStore || DEFAULT_LINKS.playStore,
    };

    let isUnderMaintenance = false;
    const maint = (config.maintenance || {}) as any;
    if (currentPlatform === 'ios') {
      isUnderMaintenance = !!(maint.ios ?? maint.iOS ?? maint.IOS);
    } else if (currentPlatform === 'android') {
      isUnderMaintenance = !!(maint.android ?? maint.Android);
    } else {
      isUnderMaintenance = !!(maint.web ?? maint.Web);
    }

    const requiredVersion =
      currentPlatform === 'ios'
        ? config.versions?.ios || '1.0.0'
        : config.versions?.android || '1.0.0';

    const updateRequired = isUpdateRequired(currentVersion, requiredVersion);
    const updateUrl = currentPlatform === 'ios' ? links.appleStore : links.playStore;

    return {
      versionInfo: {
        currentVersion,
        requiredVersion,
        updateRequired,
        updateUrl,
      },
      maintenanceInfo: {
        isUnderMaintenance,
        platform: currentPlatform,
      },
      appLinks: links,
    };
  } catch (error) {
    console.warn('[Version Check] Combined app status check failed, using safe defaults:', error);

    return {
      versionInfo: {
        currentVersion,
        requiredVersion: '1.0.0',
        updateRequired: false,
      },
      maintenanceInfo: {
        isUnderMaintenance: false,
        platform: currentPlatform,
      },
      appLinks: DEFAULT_LINKS,
    };
  }
}
