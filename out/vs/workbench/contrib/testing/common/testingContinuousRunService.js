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
import * as arrays from '../../../../base/common/arrays.js';
import { CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { Emitter } from '../../../../base/common/event.js';
import { Disposable, DisposableMap, DisposableStore, toDisposable, } from '../../../../base/common/lifecycle.js';
import { observableValue } from '../../../../base/common/observable.js';
import { autorunIterableDelta } from '../../../../base/common/observableInternal/autorun.js';
import { WellDefinedPrefixTree } from '../../../../base/common/prefixTree.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { IStorageService, } from '../../../../platform/storage/common/storage.js';
import { StoredValue } from './storedValue.js';
import { TestId } from './testId.js';
import { TestingContextKeys } from './testingContextKeys.js';
import { ITestProfileService } from './testProfileService.js';
import { ITestService } from './testService.js';
export const ITestingContinuousRunService = createDecorator('testingContinuousRunService');
let TestingContinuousRunService = class TestingContinuousRunService extends Disposable {
    get lastRunProfileIds() {
        return this.lastRun.get(new Set());
    }
    constructor(testService, storageService, contextKeyService, testProfileService) {
        super();
        this.testService = testService;
        this.testProfileService = testProfileService;
        this.changeEmitter = new Emitter();
        this.running = new WellDefinedPrefixTree();
        this.onDidChange = this.changeEmitter.event;
        const isGloballyOn = TestingContextKeys.isContinuousModeOn.bindTo(contextKeyService);
        this._register(this.onDidChange(() => {
            isGloballyOn.set(!!this.running.root.value);
        }));
        this.lastRun = this._register(new StoredValue({
            key: 'lastContinuousRunProfileIds',
            scope: 1 /* StorageScope.WORKSPACE */,
            target: 1 /* StorageTarget.MACHINE */,
            serialization: {
                deserialize: (v) => new Set(JSON.parse(v)),
                serialize: (v) => JSON.stringify([...v]),
            },
        }, storageService));
        this._register(toDisposable(() => {
            for (const cts of this.running.values()) {
                cts.handle.dispose();
            }
        }));
    }
    /** @inheritdoc */
    isSpecificallyEnabledFor(testId) {
        return this.running.size > 0 && this.running.hasKey(TestId.fromString(testId).path);
    }
    /** @inheritdoc */
    isEnabledForAParentOf(testId) {
        return (!!this.running.root.value ||
            (this.running.size > 0 && this.running.hasKeyOrParent(TestId.fromString(testId).path)));
    }
    /** @inheritdoc */
    isEnabledForProfile({ profileId, controllerId }) {
        for (const node of this.running.values()) {
            if (node.profiles
                .get()
                .some((p) => p.profileId === profileId && p.controllerId === controllerId)) {
                return true;
            }
        }
        return false;
    }
    /** @inheritdoc */
    isEnabledForAChildOf(testId) {
        return (!!this.running.root.value ||
            (this.running.size > 0 && this.running.hasKeyOrChildren(TestId.fromString(testId).path)));
    }
    /** @inheritdoc */
    isEnabled() {
        return !!this.running.root.value || this.running.size > 0;
    }
    /** @inheritdoc */
    start(profiles, testId) {
        const store = new DisposableStore();
        let actualProfiles;
        if (profiles instanceof Array) {
            actualProfiles = observableValue('crProfiles', profiles);
        }
        else {
            // restart the continuous run when default profiles change, if we were
            // asked to run for a group
            const getRelevant = () => this.testProfileService
                .getGroupDefaultProfiles(profiles)
                .filter((p) => p.supportsContinuousRun && (!testId || TestId.root(testId) === p.controllerId));
            actualProfiles = observableValue('crProfiles', getRelevant());
            store.add(this.testProfileService.onDidChange(() => {
                if (ref.autoSetDefault) {
                    const newRelevant = getRelevant();
                    if (!arrays.equals(newRelevant, actualProfiles.get())) {
                        actualProfiles.set(getRelevant(), undefined);
                    }
                }
            }));
        }
        const path = testId ? TestId.fromString(testId).path : [];
        const ref = {
            profiles: actualProfiles,
            handle: store,
            path,
            autoSetDefault: typeof profiles === 'number',
        };
        // If we're already running this specific test, then add the profile and turn
        // off the auto-addition of bitset-based profiles.
        const existing = this.running.find(path);
        if (existing) {
            store.dispose();
            ref.autoSetDefault = existing.autoSetDefault = false;
            existing.profiles.set([...new Set([...actualProfiles.get(), ...existing.profiles.get()])], undefined);
            this.changeEmitter.fire(testId);
            return;
        }
        this.running.insert(path, ref);
        const cancellationStores = new DisposableMap();
        store.add(toDisposable(() => {
            for (const cts of cancellationStores.values()) {
                cts.cancel();
            }
            cancellationStores.dispose();
        }));
        store.add(autorunIterableDelta((reader) => actualProfiles.read(reader), ({ addedValues, removedValues }) => {
            for (const profile of addedValues) {
                const cts = new CancellationTokenSource();
                this.testService.startContinuousRun({
                    continuous: true,
                    group: profile.group,
                    targets: [
                        {
                            testIds: [testId ?? profile.controllerId],
                            controllerId: profile.controllerId,
                            profileId: profile.profileId,
                        },
                    ],
                }, cts.token);
                cancellationStores.set(profile, cts);
            }
            for (const profile of removedValues) {
                cancellationStores.get(profile)?.cancel();
                cancellationStores.deleteAndDispose(profile);
            }
            this.lastRun.store(new Set([...cancellationStores.keys()].map((p) => p.profileId)));
        }));
        this.changeEmitter.fire(testId);
    }
    /** Stops a continuous run for the profile across all test items that are running it. */
    stopProfile({ profileId, controllerId }) {
        const toDelete = [];
        for (const node of this.running.values()) {
            const profs = node.profiles.get();
            const filtered = profs.filter((p) => p.profileId !== profileId || p.controllerId !== controllerId);
            if (filtered.length === profs.length) {
                continue;
            }
            else if (filtered.length === 0) {
                toDelete.push(node);
            }
            else {
                node.profiles.set(filtered, undefined);
            }
        }
        for (let i = toDelete.length - 1; i >= 0; i--) {
            toDelete[i].handle.dispose();
            this.running.delete(toDelete[i].path);
        }
        this.changeEmitter.fire(undefined);
    }
    /** @inheritdoc */
    stop(testId) {
        const cancellations = [
            ...this.running.deleteRecursive(testId ? TestId.fromString(testId).path : []),
        ];
        // deleteRecursive returns a BFS order, reverse it so children are cancelled before parents
        for (let i = cancellations.length - 1; i >= 0; i--) {
            cancellations[i].handle.dispose();
        }
        this.changeEmitter.fire(testId);
    }
};
TestingContinuousRunService = __decorate([
    __param(0, ITestService),
    __param(1, IStorageService),
    __param(2, IContextKeyService),
    __param(3, ITestProfileService)
], TestingContinuousRunService);
export { TestingContinuousRunService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdGluZ0NvbnRpbnVvdXNSdW5TZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVzdGluZy9jb21tb24vdGVzdGluZ0NvbnRpbnVvdXNSdW5TZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxNQUFNLE1BQU0sbUNBQW1DLENBQUE7QUFDM0QsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDakYsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLGtDQUFrQyxDQUFBO0FBQ2pFLE9BQU8sRUFDTixVQUFVLEVBQ1YsYUFBYSxFQUNiLGVBQWUsRUFDZixZQUFZLEdBQ1osTUFBTSxzQ0FBc0MsQ0FBQTtBQUM3QyxPQUFPLEVBQXVCLGVBQWUsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQzVGLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHVEQUF1RCxDQUFBO0FBQzVGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQzdFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBQ3pGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUM1RixPQUFPLEVBQ04sZUFBZSxHQUdmLE1BQU0sZ0RBQWdELENBQUE7QUFDdkQsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLGtCQUFrQixDQUFBO0FBQzlDLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxhQUFhLENBQUE7QUFDcEMsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0seUJBQXlCLENBQUE7QUFDNUQsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0seUJBQXlCLENBQUE7QUFDN0QsT0FBTyxFQUFFLFlBQVks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