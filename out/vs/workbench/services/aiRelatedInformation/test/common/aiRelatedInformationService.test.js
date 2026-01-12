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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWlSZWxhdGVkSW5mb3JtYXRpb25TZXJ2aWNlLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9haVJlbGF0ZWRJbmZvcm1hdGlvbi90ZXN0L2NvbW1vbi9haVJlbGF0ZWRJbmZvcm1hdGlvblNlcnZpY2UudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxLQUFLLEtBQUssTUFBTSxPQUFPLENBQUE7QUFDOUIsT0FBTyxFQUFFLDJCQUEyQixFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDekYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDJDQUEyQyxDQUFBO0FBQzFFLE9BQU8sRUFHTixzQkFBc0IsR0FFdEIsTUFBTSxzQ0FBc0MsQ0FBQTtBQUM3QyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUM5RSxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUVsRyxLQUFLLENBQUMsNkJBQTZCLEVBQUUsR0FBRyxFQUFFO0lBQ3pDLE1BQU0sS0FBSyxHQUFHLHVDQUF1QyxFQUFFLENBQUE7SUFDdkQsSUFBSSxPQUFvQyxDQUFBO0lBRXhDLEtBQUssQ0FBQyxHQUFHLEVBQUU7UUFDVixPQUFPLEdBQUcsSUFBSSwyQkFBMkIsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksY0FBYyxFQUFFLENBQUMsQ0FBQyxDQUFBO0lBQzNFLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLDBDQUEwQyxFQUFFLEdBQUcsRUFBRTtRQUNyRCxNQUFNLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUN4QyxLQUFLLENB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