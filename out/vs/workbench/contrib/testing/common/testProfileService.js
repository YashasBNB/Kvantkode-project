/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { Emitter } from '../../../../base/common/event.js';
import { Iterable } from '../../../../base/common/iterator.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { deepClone } from '../../../../base/common/objects.js';
import { IContextKeyService, } from '../../../../platform/contextkey/common/contextkey.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { IStorageService, } from '../../../../platform/storage/common/storage.js';
import { StoredValue } from './storedValue.js';
import { TestId } from './testId.js';
import { testRunProfileBitsetList, } from './testTypes.js';
import { TestingContextKeys } from './testingContextKeys.js';
export const ITestProfileService = createDecorator('testProfileService');
/**
 * Gets whether the given profile can be used to run the test.
 */
export const canUseProfileWithTest = (profile, test) => profile.controllerId === test.controllerId &&
    (TestId.isRoot(test.item.extId) || !profile.tag || test.item.tags.includes(profile.tag));
const sorter = (a, b) => {
    if (a.isDefault !== b.isDefault) {
        return a.isDefault ? -1 : 1;
    }
    return a.label.localeCompare(b.label);
};
/**
 * Given a capabilities bitset, returns a map of context keys representing
 * them.
 */
export const capabilityContextKeys = (capabilities) => [
    [TestingContextKeys.hasRunnableTests.key, (capabilities & 2 /* TestRunProfileBitset.Run */) !== 0],
    [TestingContextKeys.hasDebuggableTests.key, (capabilities & 4 /* TestRunProfileBitset.Debug */) !== 0],
    [TestingContextKeys.hasCoverableTests.key, (capabilities & 8 /* TestRunProfileBitset.Coverage */) !== 0],
];
let TestProfileService = class TestProfileService extends Disposable {
    constructor(contextKeyService, storageService) {
        super();
        this.changeEmitter = this._register(new Emitter());
        this.controllerProfiles = new Map();
        /** @inheritdoc */
        this.onDidChange = this.changeEmitter.event;
        storageService.remove('testingPreferredProfiles', 1 /* StorageScope.WORKSPACE */); // cleanup old format
        this.userDefaults = this._register(new StoredValue({
            key: 'testingPreferredProfiles2',
            scope: 1 /* StorageScope.WORKSPACE */,
            target: 1 /* StorageTarget.MACHINE */,
        }, storageService));
        this.capabilitiesContexts = {
            [2 /* TestRunProfileBitset.Run */]: TestingContextKeys.hasRunnableTests.bindTo(contextKeyService),
            [4 /* TestRunProfileBitset.Debug */]: TestingContextKeys.hasDebuggableTests.bindTo(contextKeyService),
            [8 /* TestRunProfileBitset.Coverage */]: TestingContextKeys.hasCoverableTests.bindTo(contextKeyService),
            [16 /* TestRunProfileBitset.HasNonDefaultProfile */]: TestingContextKeys.hasNonDefaultProfile.bindTo(contextKeyService),
            [32 /* TestRunProfileBitset.HasConfigurable */]: TestingContextKeys.hasConfigurableProfile.bindTo(contextKeyService),
            [64 /* TestRunProfileBitset.SupportsContinuousRun */]: TestingContextKeys.supportsContinuousRun.bindTo(contextKeyService),
        };
        this.refreshContextKeys();
    }
    /** @inheritdoc */
    addProfile(controller, profile) {
        const previousExplicitDefaultValue = this.userDefaults.get()?.[controller.id]?.[profile.profileId];
        const extended = {
            ...profile,
            isDefault: previousExplicitDefaultValue ?? profile.isDefault,
            wasInitiallyDefault: profile.isDefault,
        };
        let record = this.controllerProfiles.get(profile.controllerId);
        if (record) {
            record.profiles.push(extended);
            record.profiles.sort(sorter);
        }
        else {
            record = {
                profiles: [extended],
                controller,
            };
            this.controllerProfiles.set(profile.controllerId, record);
        }
        this.refreshContextKeys();
        this.changeEmitter.fire();
    }
    /** @inheritdoc */
    updateProfile(controllerId, profileId, update) {
        const ctrl = this.controllerProfiles.get(controllerId);
        if (!ctrl) {
            return;
        }
        const profile = ctrl.profiles.find((c) => c.controllerId === controllerId && c.profileId === profileId);
        if (!profile) {
            return;
        }
        Object.assign(profile, update);
        ctrl.profiles.sort(sorter);
        // store updates is isDefault as if the user changed it (which they might
        // have through some extension-contributed UI)
        if (update.isDefault !== undefined) {
            const map = deepClone(this.userDefaults.get({}));
            setIsDefault(map, profile, update.isDefault);
            this.userDefaults.store(map);
        }
        this.changeEmitter.fire();
    }
    /** @inheritdoc */
    configure(controllerId, profileId) {
        this.controllerProfiles.get(controllerId)?.controller.configureRunProfile(profileId);
    }
    /** @inheritdoc */
    removeProfile(controllerId, profileId) {
        const ctrl = this.controllerProfiles.get(controllerId);
        if (!ctrl) {
            return;
        }
        if (!profileId) {
            this.controllerProfiles.delete(controllerId);
            this.changeEmitter.fire();
            return;
        }
        const index = ctrl.profiles.findIndex((c) => c.profileId === profileId);
        if (index === -1) {
            return;
        }
        ctrl.profiles.splice(index, 1);
        this.refreshContextKeys();
        this.changeEmitter.fire();
    }
    /** @inheritdoc */
    capabilitiesForTest(test) {
        const ctrl = this.controllerProfiles.get(TestId.root(test.extId));
        if (!ctrl) {
            return 0;
        }
        let capabilities = 0;
        for (const profile of ctrl.profiles) {
            if (!profile.tag || test.tags.includes(profile.tag)) {
                capabilities |=
                    capabilities & profile.group ? 16 /* TestRunProfileBitset.HasNonDefaultProfile */ : profile.group;
            }
        }
        return capabilities;
    }
    /** @inheritdoc */
    all() {
        return this.controllerProfiles.values();
    }
    /** @inheritdoc */
    getControllerProfiles(profileId) {
        return this.controllerProfiles.get(profileId)?.profiles ?? [];
    }
    /** @inheritdoc */
    getGroupDefaultProfiles(group, controllerId) {
        const allProfiles = controllerId
            ? this.controllerProfiles.get(controllerId)?.profiles || []
            : [...Iterable.flatMap(this.controllerProfiles.values(), (c) => c.profiles)];
        const defaults = allProfiles.filter((c) => c.group === group && c.isDefault);
        // have *some* default profile to run if none are set otherwise
        if (defaults.length === 0) {
            const first = allProfiles.find((p) => p.group === group);
            if (first) {
                defaults.push(first);
            }
        }
        return defaults;
    }
    /** @inheritdoc */
    setGroupDefaultProfiles(group, profiles) {
        const next = {};
        for (const ctrl of this.controllerProfiles.values()) {
            next[ctrl.controller.id] = {};
            for (const profile of ctrl.profiles) {
                if (profile.group !== group) {
                    continue;
                }
                setIsDefault(next, profile, profiles.some((p) => p.profileId === profile.profileId));
            }
            // When switching a profile, if the controller has a same-named profile in
            // other groups, update those to match the enablement state as well.
            for (const profile of ctrl.profiles) {
                if (profile.group === group) {
                    continue;
                }
                const matching = ctrl.profiles.find((p) => p.group === group && p.label === profile.label);
                if (matching) {
                    setIsDefault(next, profile, matching.isDefault);
                }
            }
            ctrl.profiles.sort(sorter);
        }
        this.userDefaults.store(next);
        this.changeEmitter.fire();
    }
    getDefaultProfileForTest(group, test) {
        return this.getControllerProfiles(test.controllerId).find((p) => (p.group & group) !== 0 && canUseProfileWithTest(p, test));
    }
    refreshContextKeys() {
        let allCapabilities = 0;
        for (const { profiles } of this.controllerProfiles.values()) {
            for (const profile of profiles) {
                allCapabilities |=
                    allCapabilities & profile.group
                        ? 16 /* TestRunProfileBitset.HasNonDefaultProfile */
                        : profile.group;
                allCapabilities |= profile.supportsContinuousRun
                    ? 64 /* TestRunProfileBitset.SupportsContinuousRun */
                    : 0;
            }
        }
        for (const group of testRunProfileBitsetList) {
            this.capabilitiesContexts[group].set((allCapabilities & group) !== 0);
        }
    }
};
TestProfileService = __decorate([
    __param(0, IContextKeyService),
    __param(1, IStorageService)
], TestProfileService);
export { TestProfileService };
const setIsDefault = (map, profile, isDefault) => {
    profile.isDefault = isDefault;
    map[profile.controllerId] ??= {};
    if (profile.isDefault !== profile.wasInitiallyDefault) {
        map[profile.controllerId][profile.profileId] = profile.isDefault;
    }
    else {
        delete map[profile.controllerId][profile.profileId];
    }
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdFByb2ZpbGVTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVzdGluZy9jb21tb24vdGVzdFByb2ZpbGVTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDOUQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUM5RCxPQUFPLEVBRU4sa0JBQWtCLEdBQ2xCLE1BQU0sc0RBQXNELENBQUE7QUFDN0QsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQzVGLE9BQU8sRUFDTixlQUFlLEdBR2YsTUFBTSxnREFBZ0QsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sa0JBQWtCLENBQUE7QUFDOUMsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLGFBQWEsQ0FBQTtBQUVwQyxPQUFPLEVBS04sd0JBQXdCLEdBQ3hCLE1BQU0sZ0JBQWdCLENBQUE7QUFDdkIsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0seUJBQXlCLENBQUE7QUFFNUQsTUFBTSxDQUFDLE1BQU0sbUJBQW1CLEdBQUcsZUFBZSxDQUFzQixvQkFBb0IsQ0FBQyxDQUFBO0FBd0U3Rjs7R0FFRztBQUNILE1BQU0sQ0FBQyxNQUFNLHFCQUFxQixHQUFHLENBQUMsT0FBd0IsRUFBRSxJQUFzQixFQUFFLEVBQUUsQ0FDekYsT0FBTyxDQUFDLFlBQVksS0FBSyxJQUFJLENBQUMsWUFBWTtJQUMxQyxDQUFDLE1BQU0sQ0FB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