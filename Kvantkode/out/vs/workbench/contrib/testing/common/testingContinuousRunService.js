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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdGluZ0NvbnRpbnVvdXNSdW5TZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXN0aW5nL2NvbW1vbi90ZXN0aW5nQ29udGludW91c1J1blNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLE1BQU0sTUFBTSxtQ0FBbUMsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNqRixPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sa0NBQWtDLENBQUE7QUFDakUsT0FBTyxFQUNOLFVBQVUsRUFDVixhQUFhLEVBQ2IsZUFBZSxFQUNmLFlBQVksR0FDWixNQUFNLHNDQUFzQyxDQUFBO0FBQzdDLE9BQU8sRUFBdUIsZUFBZSxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDNUYsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sdURBQXVELENBQUE7QUFDNUYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDN0UsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDekYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQzVGLE9BQU8sRUFDTixlQUFlLEdBR2YsTUFBTSxnREFBZ0QsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sa0JBQWtCLENBQUE7QUFDOUMsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLGFBQWEsQ0FBQTtBQUNwQyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx5QkFBeUIsQ0FB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