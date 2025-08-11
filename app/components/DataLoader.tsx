'use client';

import { useEffect, useRef } from 'react';
import { useSession, signIn } from '~/auth/auth-client';
import { useDataSourcesStore } from '~/lib/stores/dataSources';
import { usePluginStore } from '~/lib/plugins/plugin-store';
import type { DataSourceType } from '~/lib/stores/dataSourceTypes';
import { useDataSourceTypesStore } from '~/lib/stores/dataSourceTypes';
import { useRouter } from 'next/navigation';
import type { PluginAccessMap } from '~/lib/plugins/types';
import { useUserStore } from '~/lib/stores/user';
import { DATA_SOURCE_CONNECTION_ROUTE, TELEMETRY_CONSENT_ROUTE } from '~/lib/constants/routes';
import { initializeClientTelemetry } from '~/lib/telemetry/telemetry-client';
import type { UserProfile } from '~/lib/services/userService';
import { useAuthProvidersPlugin } from '~/lib/hooks/plugins/useAuthProvidersPlugin';

export interface RootData {
  user: UserProfile | null;
  dataSources: Array<{
    id: string;
    name: string;
    connectionString: string;
    createdAt: string;
    updatedAt: string;
  }>;
  pluginAccess: PluginAccessMap;
  dataSourceTypes: DataSourceType[];
}

interface DataLoaderProps {
  children: React.ReactNode;
  rootData: RootData;
}

export function DataLoader({ children, rootData }: DataLoaderProps) {
  const { data: session } = useSession();
  const { setDataSources } = useDataSourcesStore();
  const { setPluginAccess } = usePluginStore();
  const { setDataSourceTypes } = useDataSourceTypesStore();
  const { setUser, clearUser, user } = useUserStore();
  const { anonymousProvider } = useAuthProvidersPlugin();
  const router = useRouter();
  const isLoggingIn = useRef(false);

  useEffect(() => {
    console.log('🔍 DataLoader auth check:', {
      hasSession: !!session?.user,
      hasAnonymousProvider: !!anonymousProvider,
      isLoggingIn: isLoggingIn.current,
    });

    // If no session and anonymous provider is available, try anonymous login
    if (!session?.user && anonymousProvider && !isLoggingIn.current) {
      loginAnonymous();

      return;
    }

    // If login is in progress, wait for it to complete
    if (!session?.user && isLoggingIn.current) {
      console.log('⏳ Anonymous login in progress, waiting...');
      return;
    }

    // Set data sources
    if (rootData.dataSources) {
      setDataSources(rootData.dataSources);
    }

    // Set plugin access
    if (rootData.pluginAccess) {
      setPluginAccess(rootData.pluginAccess);
    }

    // Set data source types
    if (rootData.dataSourceTypes) {
      setDataSourceTypes(rootData.dataSourceTypes);
    }

    // Set user profile
    if (rootData.user) {
      setUser(rootData.user);

      // Redirect to telemetry consent screen if user hasn't answered yet (when telemetryEnabled is null)
      if (rootData.user.telemetryEnabled === null) {
        const currentPath = window.location.pathname;

        if (currentPath !== TELEMETRY_CONSENT_ROUTE) {
          router.push(TELEMETRY_CONSENT_ROUTE);
        }

        return;
      }

      if (rootData.user.telemetryEnabled) {
        initializeClientTelemetry(rootData.user);
      }
    }

    // Redirect to data source connection if no data sources exist
    if (rootData.dataSources && rootData.dataSources.length === 0) {
      const currentPath = window.location.pathname;

      if (currentPath !== DATA_SOURCE_CONNECTION_ROUTE) {
        router.push(DATA_SOURCE_CONNECTION_ROUTE);
      }

      router.push(DATA_SOURCE_CONNECTION_ROUTE);

      return;
    }
  }, [
    session?.user,
    anonymousProvider,
    rootData,
    setDataSources,
    setPluginAccess,
    setDataSourceTypes,
    setUser,
    clearUser,
    user,
    router,
  ]);

  const loginAnonymous = async () => {
    if (isLoggingIn.current) {
      console.log('⏳ Login already in progress, skipping...');
      return;
    }

    isLoggingIn.current = true;

    try {
      console.log('🔐 Attempting anonymous login...');

      const { error: signInError } = await signIn.email({
        email: 'anonymous@anonymous.com',
        password: 'password1234',
        rememberMe: true,
      });

      if (signInError) {
        console.error('❌ Failed to sign in anonymous user:', signInError);
        return;
      }

      console.log('✅ Anonymous login successful');
      router.push('/');
    } catch (error: any) {
      console.error(`❌ Anonymous login failed: ${error?.message}`);
    } finally {
      isLoggingIn.current = false;
    }
  };

  return <>{children}</>;
}
