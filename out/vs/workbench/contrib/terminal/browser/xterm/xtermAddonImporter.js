/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { importAMDNodeModule } from '../../../../../amdX.js';
const importedAddons = new Map();
/**
 * Exposes a simple interface to consumers, encapsulating the messy import xterm
 * addon import and caching logic.
 */
export class XtermAddonImporter {
    async importAddon(name) {
        let addon = importedAddons.get(name);
        if (!addon) {
            switch (name) {
                case 'clipboard':
                    addon = (await importAMDNodeModule('@xterm/addon-clipboard', 'lib/addon-clipboard.js')).ClipboardAddon;
                    break;
                case 'image':
                    addon = (await importAMDNodeModule('@xterm/addon-image', 'lib/addon-image.js')).ImageAddon;
                    break;
                case 'ligatures':
                    addon = (await importAMDNodeModule('@xterm/addon-ligatures', 'lib/addon-ligatures.js')).LigaturesAddon;
                    break;
                case 'progress':
                    addon = (await importAMDNodeModule('@xterm/addon-progress', 'lib/addon-progress.js')).ProgressAddon;
                    break;
                case 'search':
                    addon = (await importAMDNodeModule('@xterm/addon-search', 'lib/addon-search.js')).SearchAddon;
                    break;
                case 'serialize':
                    addon = (await importAMDNodeModule('@xterm/addon-serialize', 'lib/addon-serialize.js')).SerializeAddon;
                    break;
                case 'unicode11':
                    addon = (await importAMDNodeModule('@xterm/addon-unicode11', 'lib/addon-unicode11.js')).Unicode11Addon;
                    break;
                case 'webgl':
                    addon = (await importAMDNodeModule('@xterm/addon-webgl', 'lib/addon-webgl.js')).WebglAddon;
                    break;
            }
            if (!addon) {
                throw new Error(`Could not load addon ${name}`);
            }
            importedAddons.set(name, addon);
        }
        return addon;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoieHRlcm1BZGRvbkltcG9ydGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbC9icm93c2VyL3h0ZXJtL3h0ZXJtQWRkb25JbXBvcnRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQVVoRyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQTtBQW9CNUQsTUFBTSxjQUFjLEdBQTJCLElBQUksR0FBRyxFQUFFLENBQUE7QUFFeEQ7OztHQUdHO0FBQ0gsTUFBTSxPQUFPLGtCQUFrQjtJQUM5QixLQUFLLENBQUMsV0FBVyxDQUNoQixJQUFPO1FBRVAsSUFBSSxLQUFLLEdBQUcsY0FBYyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUNwQyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDWixRQUFRLElBQUksRUFBRSxDQUFDO2dCQUNkLEtBQUssV0FBVztvQkFDZixLQUFLLEdBQUcsQ0FDUCxNQUFNLG1CQUFtQixDQUN4Qix3QkFBd0IsRUFDeEIsd0JBQXdCLENBQ3hCLENBQ0QsQ0FBQyxjQUEwQyxDQUFBO29CQUM1QyxNQUFLO2dCQUNOLEtBQUssT0FBTztvQkFDWCxLQUFLLEdBQUcsQ0FDUCxNQUFNLG1CQUFtQixDQUN4QixvQkFBb0IsRUFDcEIsb0JBQW9CLENBQ3BCLENBQ0QsQ0FBQyxVQUFzQyxDQUFBO29CQUN4QyxNQUFLO2dCQUNOLEtBQUssV0FBVztvQkFDZixLQUFLLEdBQUcsQ0FDUCxNQUFNLG1CQUFtQixDQUN4Qix3QkFBd0IsRUFDeEIsd0JBQXdCLENBQ3hCLENBQ0QsQ0FBQyxjQUEwQyxDQUFBO29CQUM1QyxNQUFLO2dCQUNOLEtBQUssVUFBVTtvQkFDZCxLQUFLLEdBQUcsQ0FDUCxNQUFNLG1CQUFtQixDQUN4Qix1QkFBdUIsRUFDdkIsdUJBQXVCLENBQ3ZCLENBQ0QsQ0FBQyxhQUF5QyxDQUFBO29CQUMzQyxNQUFLO2dCQUNOLEtBQUssUUFBUTtvQkFDWixLQUFLLEdBQUcsQ0FDUCxNQUFNLG1CQUFtQixDQUN4QixxQkFBcUIsRUFDckIscUJBQXFCLENBQ3JCLENBQ0QsQ0FBQyxXQUF1QyxDQUFBO29CQUN6QyxNQUFLO2dCQUNOLEtBQUssV0FBVztvQkFDZixLQUFLLEdBQUcsQ0FDUCxNQUFNLG1CQUFtQixDQUN4Qix3QkFBd0IsRUFDeEIsd0JBQXdCLENBQ3hCLENBQ0QsQ0FBQyxjQUEwQyxDQUFBO29CQUM1QyxNQUFLO2dCQUNOLEtBQUssV0FBVztvQkFDZixLQUFLLEdBQUcsQ0FDUCxNQUFNLG1CQUFtQixDQUN4Qix3QkFBd0IsRUFDeEIsd0JBQXdCLENBQ3hCLENBQ0QsQ0FBQyxjQUEwQyxDQUFBO29CQUM1QyxNQUFLO2dCQUNOLEtBQUssT0FBTztvQkFDWCxLQUFLLEdBQUcsQ0FDUCxNQUFNLG1CQUFtQixDQUN4QixvQkFBb0IsRUFDcEIsb0JBQW9CLENBQ3BCLENBQ0QsQ0FBQyxVQUFzQyxDQUFBO29CQUN4QyxNQUFLO1lBQ1AsQ0FBQztZQUNELElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztnQkFDWixNQUFNLElBQUksS0FBSyxDQUFDLHdCQUF3QixJQUFJLEVBQUUsQ0FBQyxDQUFBO1lBQ2hELENBQUM7WUFDRCxjQUFjLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUNoQyxDQUFDO1FBQ0QsT0FBTyxLQUFpQyxDQUFBO0lBQ3pDLENBQUM7Q0FDRCJ9