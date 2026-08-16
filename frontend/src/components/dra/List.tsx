/*
 * Copyright 2025 The Kubernetes Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { useTranslation } from 'react-i18next';
import { DeviceClass, ResourceClaim, ResourceClaimTemplate, ResourceSlice } from '../../lib/k8s/dra';
import ResourceListView from '../common/Resource/ResourceListView';

export function DeviceClassList() {
  const { t } = useTranslation(['glossary', 'translation']);

  return (
    <ResourceListView
      title={t('glossary|Device Classes')}
      resourceClass={DeviceClass}
      columns={[
        'name',
        'cluster',
        {
          id: 'selectors',
          label: t('translation|Selectors'),
          getValue: item => item?.spec?.selectors?.map(s => s.cel?.expression).join(', ') ?? '',
        },
        'age',
      ]}
    />
  );
}

export function ResourceSliceList() {
  const { t } = useTranslation(['glossary', 'translation']);

  return (
    <ResourceListView
      title={t('glossary|Resource Slices')}
      resourceClass={ResourceSlice}
      columns={[
        'name',
        'cluster',
        {
          id: 'driver',
          label: t('translation|Driver'),
          getValue: item => item?.spec?.driver,
        },
        {
          id: 'pool',
          label: t('translation|Pool'),
          getValue: item => item?.spec?.pool?.name,
        },
        {
          id: 'node',
          label: t('glossary|Node'),
          getValue: item => item?.spec?.nodeName ?? '',
        },
        {
          id: 'devices',
          label: t('translation|Devices'),
          getValue: item => String(item?.spec?.devices?.length ?? 0),
        },
        'age',
      ]}
    />
  );
}

export function ResourceClaimList() {
  const { t } = useTranslation(['glossary', 'translation']);

  return (
    <ResourceListView
      title={t('glossary|Resource Claims')}
      resourceClass={ResourceClaim}
      columns={[
        'name',
        'namespace',
        'cluster',
        {
          id: 'allocated',
          label: t('translation|Allocated Devices'),
          getValue: item => item?.allocatedDevices?.join(', ') ?? '',
        },
        {
          id: 'consumers',
          label: t('translation|Consumers'),
          getValue: item => item?.consumers?.join(', ') ?? '',
        },
        'age',
      ]}
    />
  );
}

export function ResourceClaimTemplateList() {
  const { t } = useTranslation(['glossary', 'translation']);

  return (
    <ResourceListView
      title={t('glossary|Resource Claim Templates')}
      resourceClass={ResourceClaimTemplate}
      columns={[
        'name',
        'namespace',
        'cluster',
        {
          id: 'requests',
          label: t('translation|Requests'),
          getValue: item =>
            item?.spec?.spec?.devices?.requests
              ?.map(r => `${r.name}: ${r.exactly?.deviceClassName ?? ''}`)
              .join(', ') ?? '',
        },
        'age',
      ]}
    />
  );
}
