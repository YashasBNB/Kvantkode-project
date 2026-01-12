/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { registerWorkbenchContribution2 } from '../../../common/contributions.js';
import { ISplashStorageService } from './splash.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { PartsSplash } from './partsSplash.js';
registerSingleton(ISplashStorageService, class SplashStorageService {
    async saveWindowSplash(splash) {
        const raw = JSON.stringify(splash);
        localStorage.setItem('monaco-parts-splash', raw);
    }
}, 1 /* InstantiationType.Delayed */);
registerWorkbenchContribution2(PartsSplash.ID, PartsSplash, 1 /* WorkbenchPhase.BlockStartup */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3BsYXNoLmNvbnRyaWJ1dGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvc3BsYXNoL2Jyb3dzZXIvc3BsYXNoLmNvbnRyaWJ1dGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQWtCLDhCQUE4QixFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDakcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sYUFBYSxDQUFBO0FBQ25ELE9BQU8sRUFFTixpQkFBaUIsR0FDakIsTUFBTSx5REFBeUQsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sa0JBQWtCLENBQUE7QUFHOUMsaUJBQWlCLENBQ2hCLHFCQUFxQixFQUNyQixNQUFNLG9CQUFvQjtJQUd6QixLQUFLLENBQUMsZ0JBQWdCLENBQUMsTUFBb0I7UUFDMUMsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUNsQyxZQUFZLENBQUMsT0FBTyxDQUFDLHFCQUFxQixFQUFFLEdBQUcsQ0FBQyxDQUFBO0lBQ2pELENBQUM7Q0FDRCxvQ0FFRCxDQUFBO0FBRUQsOEJBQThCLENBQUMsV0FBVyxDQUFDLEVBQUUsRUFBRSxXQUFXLHNDQUE4QixDQUFBIn0=