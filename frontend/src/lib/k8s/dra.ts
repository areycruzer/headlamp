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

import type { KubeObjectInterface } from './KubeObject';
import { KubeObject } from './KubeObject';

export interface KubeDeviceClass extends KubeObjectInterface {
  spec: {
    selectors?: { cel?: { expression: string } }[];
    config?: any[];
  };
}

export class DeviceClass extends KubeObject<KubeDeviceClass> {
  static kind = 'DeviceClass';
  static apiName = 'deviceclasses';
  static apiVersion = 'resource.k8s.io/v1';
  static isNamespaced = false;

  get spec() {
    return this.jsonData.spec;
  }
}

export interface KubeResourceSlice extends KubeObjectInterface {
  spec: {
    driver: string;
    nodeName?: string;
    pool: { name: string; generation: number; resourceSliceCount: number };
    devices?: { name: string; attributes?: any; capacity?: any }[];
  };
}

export class ResourceSlice extends KubeObject<KubeResourceSlice> {
  static kind = 'ResourceSlice';
  static apiName = 'resourceslices';
  static apiVersion = 'resource.k8s.io/v1';
  static isNamespaced = false;

  get spec() {
    return this.jsonData.spec;
  }
}

export interface KubeResourceClaim extends KubeObjectInterface {
  spec: {
    devices?: {
      requests?: { name: string; exactly?: { deviceClassName: string; count?: number } }[];
    };
  };
  status?: {
    allocation?: {
      devices?: { results?: { device: string; driver: string; pool: string; request: string }[] };
    };
    reservedFor?: { name: string; resource: string; uid: string }[];
  };
}

export class ResourceClaim extends KubeObject<KubeResourceClaim> {
  static kind = 'ResourceClaim';
  static apiName = 'resourceclaims';
  static apiVersion = 'resource.k8s.io/v1';
  static isNamespaced = true;

  get spec() {
    return this.jsonData.spec;
  }

  get status() {
    return this.jsonData.status;
  }

  get allocatedDevices(): string[] {
    return (this.status?.allocation?.devices?.results ?? []).map(
      r => `${r.pool}/${r.device} (${r.driver})`
    );
  }

  get consumers(): string[] {
    return (this.status?.reservedFor ?? []).map(ref => `${ref.resource}/${ref.name}`);
  }
}

export interface KubeResourceClaimTemplate extends KubeObjectInterface {
  spec: {
    spec: KubeResourceClaim['spec'];
  };
}

export class ResourceClaimTemplate extends KubeObject<KubeResourceClaimTemplate> {
  static kind = 'ResourceClaimTemplate';
  static apiName = 'resourceclaimtemplates';
  static apiVersion = 'resource.k8s.io/v1';
  static isNamespaced = true;

  get spec() {
    return this.jsonData.spec;
  }
}
