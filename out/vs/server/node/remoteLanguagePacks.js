/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { FileAccess } from '../../base/common/network.js';
import { join } from '../../base/common/path.js';
import { resolveNLSConfiguration } from '../../base/node/nls.js';
import { Promises } from '../../base/node/pfs.js';
import product from '../../platform/product/common/product.js';
const nlsMetadataPath = join(FileAccess.asFileUri('').fsPath);
const defaultMessagesFile = join(nlsMetadataPath, 'nls.messages.json');
const nlsConfigurationCache = new Map();
export async function getNLSConfiguration(language, userDataPath) {
    if (!product.commit || !(await Promises.exists(defaultMessagesFile))) {
        return {
            userLocale: 'en',
            osLocale: 'en',
            resolvedLanguage: 'en',
            defaultMessagesFile,
            // NLS: below 2 are a relic from old times only used by vscode-nls and deprecated
            locale: 'en',
            availableLanguages: {},
        };
    }
    const cacheKey = `${language}||${userDataPath}`;
    let result = nlsConfigurationCache.get(cacheKey);
    if (!result) {
        result = resolveNLSConfiguration({
            userLocale: language,
            osLocale: language,
            commit: product.commit,
            userDataPath,
            nlsMetadataPath,
        });
        nlsConfigurationCache.set(cacheKey, result);
    }
    return result;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVtb3RlTGFuZ3VhZ2VQYWNrcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvc2VydmVyL25vZGUvcmVtb3RlTGFuZ3VhZ2VQYWNrcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFDekQsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLDJCQUEyQixDQUFBO0FBRWhELE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLHdCQUF3QixDQUFBO0FBQ2hFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQTtBQUNqRCxPQUFPLE9BQU8sTUFBTSwwQ0FBMEMsQ0FBQTtBQUU5RCxNQUFNLGVBQWUsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQTtBQUM3RCxNQUFNLG1CQUFtQixHQUFHLElBQUksQ0FBQyxlQUFlLEVBQUUsbUJBQW1CLENBQUMsQ0FBQTtBQUN0RSxNQUFNLHFCQUFxQixHQUFHLElBQUksR0FBRyxFQUFzQyxDQUFBO0FBRTNFLE1BQU0sQ0FBQyxLQUFLLFVBQVUsbUJBQW1CLENBQ3hDLFFBQWdCLEVBQ2hCLFlBQW9CO0lBRXBCLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxJQUFJLENBQUMsQ0FBQyxNQUFNLFFBQVEsQ0FBQyxNQUFNLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxFQUFFLENBQUM7UUFDdEUsT0FBTztZQUNOLFVBQVUsRUFBRSxJQUFJO1lBQ2hCLFFBQVEsRUFBRSxJQUFJO1lBQ2QsZ0JBQWdCLEVBQUUsSUFBSTtZQUN0QixtQkFBbUI7WUFFbkIsaUZBQWlGO1lBQ2pGLE1BQU0sRUFBRSxJQUFJO1lBQ1osa0JBQWtCLEVBQUUsRUFBRTtTQUN0QixDQUFBO0lBQ0YsQ0FBQztJQUVELE1BQU0sUUFBUSxHQUFHLEdBQUcsUUFBUSxLQUFLLFlBQVksRUFBRSxDQUFBO0lBQy9DLElBQUksTUFBTSxHQUFHLHFCQUFxQixDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQTtJQUNoRCxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7UUFDYixNQUFNLEdBQUcsdUJBQXVCLENBQUM7WUFDaEMsVUFBVSxFQUFFLFFBQVE7WUFDcEIsUUFBUSxFQUFFLFFBQVE7WUFDbEIsTUFBTSxFQUFFLE9BQU8sQ0FBQyxNQUFNO1lBQ3RCLFlBQVk7WUFDWixlQUFlO1NBQ2YsQ0FBQyxDQUFBO1FBQ0YscUJBQXFCLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxNQUFNLENBQUMsQ0FBQTtJQUM1QyxDQUFDO0lBRUQsT0FBTyxNQUFNLENBQUE7QUFDZCxDQUFDIn0=