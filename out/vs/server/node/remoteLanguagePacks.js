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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVtb3RlTGFuZ3VhZ2VQYWNrcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3NlcnZlci9ub2RlL3JlbW90ZUxhbmd1YWdlUGFja3MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBQ3pELE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQTtBQUVoRCxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sd0JBQXdCLENBQUE7QUFDakQsT0FBTyxPQUFPLE1BQU0sMENBQTBDLENBQUE7QUFFOUQsTUFBTSxlQUFlLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUE7QUFDN0QsTUFBTSxtQkFBbUIsR0FBRyxJQUFJLENBQUMsZUFBZSxFQUFFLG1CQUFtQixDQUFDLENBQUE7QUFDdEUsTUFBTSxxQkFBcUIsR0FBRyxJQUFJLEdBQUcsRUFBc0MsQ0FBQTtBQUUzRSxNQUFNLENBQUMsS0FBSyxVQUFVLG1CQUFtQixDQUN4QyxRQUFnQixFQUNoQixZQUFvQjtJQUVwQixJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sSUFBSSxDQUFDLENBQUMsTUFBTSxRQUFRLENBQUMsTUFBTSxDQUFDLG1CQUFtQixDQUFDLENBQUMsRUFBRSxDQUFDO1FBQ3RFLE9BQU87WUFDTixVQUFVLEVBQUUsSUFBSTtZQUNoQixRQUFRLEVBQUUsSUFBSTtZQUNkLGdCQUFnQixFQUFFLElBQUk7WUFDdEIsbUJBQW1CO1lBRW5CLGlGQUFpRjtZQUNqRixNQUFNLEVBQUUsSUFBSTtZQUNaLGtCQUFrQixFQUFFLEVBQUU7U0FDdEIsQ0FBQTtJQUNGLENBQUM7SUFFRCxNQUFNLFFBQVEsR0FBRyxHQUFHLFFBQVEsS0FBSyxZQUFZLEVBQUUsQ0FBQTtJQUMvQyxJQUFJLE1BQU0sR0FBRyxxQkFBcUIsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUE7SUFDaEQsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1FBQ2IsTUFBTSxHQUFHLHVCQUF1QixDQUFDO1lBQ2hDLFVBQVUsRUFBRSxRQUFRO1lBQ3BCLFFBQVEsRUFBRSxRQUFRO1lBQ2xCLE1BQU0sRUFBRSxPQUFPLENBQUMsTUFBTTtZQUN0QixZQUFZO1lBQ1osZUFBZTtTQUNmLENBQUMsQ0FBQTtRQUNGLHFCQUFxQixDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsTUFBTSxDQUFDLENBQUE7SUFDNUMsQ0FBQztJQUVELE9BQU8sTUFBTSxDQUFBO0FBQ2QsQ0FBQyJ9