/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import * as sinon from 'sinon';
import { AiRelatedInformationService } from '../../common/aiRelatedInformationService.js';
import { NullLogService } from '../../../../../platform/log/common/log.js';
import { RelatedInformationType, } from '../../common/aiRelatedInformation.js';
import { CancellationToken } from '../../../../../base/common/cancellation.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
suite('AiRelatedInformationService', () => {
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    let service;
    setup(() => {
        service = new AiRelatedInformationService(store.add(new NullLogService()));
    });
    test('should check if providers are registered', () => {
        assert.equal(service.isEnabled(), false);
        store.add(service.registerAiRelatedInformationProvider(RelatedInformationType.CommandInformation, {
            provideAiRelatedInformation: () => Promise.resolve([]),
        }));
        assert.equal(service.isEnabled(), true);
    });
    test('should register and unregister providers', () => {
        const provider = {
            provideAiRelatedInformation: () => Promise.resolve([]),
        };
        const disposable = service.registerAiRelatedInformationProvider(RelatedInformationType.CommandInformation, provider);
        assert.strictEqual(service.isEnabled(), true);
        disposable.dispose();
        assert.strictEqual(service.isEnabled(), false);
    });
    test('should get related information', async () => {
        const command = 'command';
        const provider = {
            provideAiRelatedInformation: () => Promise.resolve([{ type: RelatedInformationType.CommandInformation, command, weight: 1 }]),
        };
        service.registerAiRelatedInformationProvider(RelatedInformationType.CommandInformation, provider);
        const result = await service.getRelatedInformation('query', [RelatedInformationType.CommandInformation], CancellationToken.None);
        assert.strictEqual(result.length, 1);
        assert.strictEqual(result[0].command, command);
    });
    test('should get different types of related information', async () => {
        const command = 'command';
        const commandProvider = {
            provideAiRelatedInformation: () => Promise.resolve([{ type: RelatedInformationType.CommandInformation, command, weight: 1 }]),
        };
        service.registerAiRelatedInformationProvider(RelatedInformationType.CommandInformation, commandProvider);
        const setting = 'setting';
        const settingProvider = {
            provideAiRelatedInformation: () => Promise.resolve([{ type: RelatedInformationType.SettingInformation, setting, weight: 1 }]),
        };
        service.registerAiRelatedInformationProvider(RelatedInformationType.SettingInformation, settingProvider);
        const result = await service.getRelatedInformation('query', [RelatedInformationType.CommandInformation, RelatedInformationType.SettingInformation], CancellationToken.None);
        assert.strictEqual(result.length, 2);
        assert.strictEqual(result[0].command, command);
        assert.strictEqual(result[1].setting, setting);
    });
    test('should return empty array on timeout', async () => {
        const clock = sinon.useFakeTimers({
            shouldAdvanceTime: true,
        });
        const provider = {
            provideAiRelatedInformation: () => new Promise((resolve) => {
                setTimeout(() => {
                    resolve([
                        { type: RelatedInformationType.CommandInformation, command: 'command', weight: 1 },
                    ]);
                }, AiRelatedInformationService.DEFAULT_TIMEOUT + 100);
            }),
        };
        service.registerAiRelatedInformationProvider(RelatedInformationType.CommandInformation, provider);
        try {
            const promise = service.getRelatedInformation('query', [RelatedInformationType.CommandInformation], CancellationToken.None);
            clock.tick(AiRelatedInformationService.DEFAULT_TIMEOUT + 200);
            const result = await promise;
            assert.strictEqual(result.length, 0);
        }
        finally {
            clock.restore();
        }
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWlSZWxhdGVkSW5mb3JtYXRpb25TZXJ2aWNlLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvYWlSZWxhdGVkSW5mb3JtYXRpb24vdGVzdC9jb21tb24vYWlSZWxhdGVkSW5mb3JtYXRpb25TZXJ2aWNlLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sS0FBSyxLQUFLLE1BQU0sT0FBTyxDQUFBO0FBQzlCLE9BQU8sRUFBRSwyQkFBMkIsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBQ3pGLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQUMxRSxPQUFPLEVBR04sc0JBQXNCLEdBRXRCLE1BQU0sc0NBQXNDLENBQUE7QUFDN0MsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDOUUsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFFbEcsS0FBSyxDQUFDLDZCQUE2QixFQUFFLEdBQUcsRUFBRTtJQUN6QyxNQUFNLEtBQUssR0FBRyx1Q0FBdUMsRUFBRSxDQUFBO0lBQ3ZELElBQUksT0FBb0MsQ0FBQTtJQUV4QyxLQUFLLENBQUMsR0FBRyxFQUFFO1FBQ1YsT0FBTyxHQUFHLElBQUksMkJBQTJCLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLGNBQWMsRUFBRSxDQUFDLENBQUMsQ0FBQTtJQUMzRSxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQywwQ0FBMEMsRUFBRSxHQUFHLEVBQUU7UUFDckQsTUFBTSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDeEMsS0FBSyxDQUFDLEdB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