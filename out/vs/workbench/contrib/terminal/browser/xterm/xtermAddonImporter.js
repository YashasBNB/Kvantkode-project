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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoieHRlcm1BZGRvbkltcG9ydGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWwvYnJvd3Nlci94dGVybS94dGVybUFkZG9uSW1wb3J0ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFVaEcsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sd0JBQXdCLENBQUE7QUFvQjVELE1BQU0sY0FBYyxHQUEyQixJQUFJLEdBQUcsRUFBRSxDQUFBO0FBRXhEOzs7R0FHRztBQUNILE1BQU0sT0FBTyxrQkFBa0I7SUFDOUIsS0FBSyxDQUFDLFdBQVcsQ0FDaEIsSUFBTztRQUVQLElBQUksS0FBSyxHQUFHLGNBQWMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDcEMsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQ1osUUFBUSxJQUFJLEVBQUUsQ0FBQztnQkFDZCxLQUFLLFdBQVc7b0JBQ2YsS0FBSyxHQUFHLENBQ1AsTUFBTSxtQkFBbUIsQ0FDeEIsd0JBQXdCLEVBQ3hCLHdCQUF3QixDQUN4QixDQUNELENBQUMsY0FBMEMsQ0FBQTtvQkFDNUMsTUFBSztnQkFDTixLQUFLLE9BQU87b0JBQ1gsS0FBSyxHQUFHLENBQ1AsTUFBTSxtQkFBbUIsQ0FDeEIsb0JBQW9CLEVBQ3BCLG9CQUFvQixDQUNwQixDQUNELENBQUMsVUFBc0MsQ0FBQTtvQkFDeEMsTUFBSztnQkFDTixLQUFLLFdBQVc7b0JBQ2YsS0FBSyxHQUFHLENBQ1AsTUFBTSxtQkFBbUIsQ0FDeEIsd0JBQXdCLEVBQ3hCLHdCQUF3QixDQUN4QixDQUNELENBQUMsY0FBMEMsQ0FBQTtvQkFDNUMsTUFBSztnQkFDTixLQUFLLFVBQVU7b0JBQ2QsS0FBSyxHQUFHLENBQ1AsTUFBTSxtQkFBbUIsQ0FDeEIsdUJBQXVCLEVBQ3ZCLHVCQUF1QixDQUN2QixDQUNELENBQUMsYUFBeUMsQ0FBQTtvQkFDM0MsTUFBSztnQkFDTixLQUFLLFFBQVE7b0JBQ1osS0FBSyxHQUFHLENBQ1AsTUFBTSxtQkFBbUIsQ0FDeEIscUJBQXFCLEVBQ3JCLHFCQUFxQixDQUNyQixDQUNELENBQUMsV0FBdUMsQ0FBQTtvQkFDekMsTUFBSztnQkFDTixLQUFLLFdBQVc7b0JBQ2YsS0FBSyxHQUFHLENBQ1AsTUFBTSxtQkFBbUIsQ0FDeEIsd0JBQXdCLEVBQ3hCLHdCQUF3QixDQUN4QixDQUNELENBQUMsY0FBMEMsQ0FBQTtvQkFDNUMsTUFBSztnQkFDTixLQUFLLFdBQVc7b0JBQ2YsS0FBSyxHQUFHLENBQ1AsTUFBTSxtQkFBbUIsQ0FDeEIsd0JBQXdCLEVBQ3hCLHdCQUF3QixDQUN4QixDQUNELENBQUMsY0FBMEMsQ0FBQTtvQkFDNUMsTUFBSztnQkFDTixLQUFLLE9BQU87b0JBQ1gsS0FBSyxHQUFHLENBQ1AsTUFBTSxtQkFBbUIsQ0FDeEIsb0JBQW9CLEVBQ3BCLG9CQUFvQixDQUNwQixDQUNELENBQUMsVUFBc0MsQ0FBQTtvQkFDeEMsTUFBSztZQUNQLENBQUM7WUFDRCxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7Z0JBQ1osTUFBTSxJQUFJLEtBQUssQ0FBQyx3QkFBd0IsSUFBSSxFQUFFLENBQUMsQ0FBQTtZQUNoRCxDQUFDO1lBQ0QsY0FBYyxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDaEMsQ0FBQztRQUNELE9BQU8sS0FBaUMsQ0FBQTtJQUN6QyxDQUFDO0NBQ0QifQ==