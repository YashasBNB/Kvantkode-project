/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { URI } from '../../../../../base/common/uri.js';
export function claudeConfigToServerDefinition(idPrefix, contents, cwd) {
    let parsed;
    try {
        parsed = JSON.parse(contents.toString());
    }
    catch {
        return;
    }
    return Object.entries(parsed.mcpServers).map(([name, server]) => {
        return {
            id: `${idPrefix}.${name}`,
            label: name,
            launch: server.url
                ? {
                    type: 2 /* McpServerTransportType.SSE */,
                    uri: URI.parse(server.url),
                    headers: [],
                }
                : {
                    type: 1 /* McpServerTransportType.Stdio */,
                    args: server.args || [],
                    command: server.command,
                    env: server.env || {},
                    envFile: undefined,
                    cwd,
                },
        };
    });
}
export class ClaudeDesktopMpcDiscoveryAdapter {
    constructor(remoteAuthority) {
        this.remoteAuthority = remoteAuthority;
        this.order = 400 /* McpCollectionSortOrder.Filesystem */;
        this.discoverySource = "claude-desktop" /* DiscoverySource.ClaudeDesktop */;
        this.id = `claude-desktop.${this.remoteAuthority}`;
    }
    getFilePath({ platform, winAppData, xdgHome, homedir, }) {
        if (platform === 3 /* Platform.Windows */) {
            const appData = winAppData || URI.joinPath(homedir, 'AppData', 'Roaming');
            return URI.joinPath(appData, 'Claude', 'claude_desktop_config.json');
        }
        else if (platform === 1 /* Platform.Mac */) {
            return URI.joinPath(homedir, 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json');
        }
        else {
            const configDir = xdgHome || URI.joinPath(homedir, '.config');
            return URI.joinPath(configDir, 'Claude', 'claude_desktop_config.json');
        }
    }
    adaptFile(contents, { homedir }) {
        return claudeConfigToServerDefinition(this.id, contents, homedir);
    }
}
export class WindsurfDesktopMpcDiscoveryAdapter extends ClaudeDesktopMpcDiscoveryAdapter {
    constructor(remoteAuthority) {
        super(remoteAuthority);
        this.discoverySource = "windsurf" /* DiscoverySource.Windsurf */;
        this.id = `windsurf.${this.remoteAuthority}`;
    }
    getFilePath({ homedir }) {
        return URI.joinPath(homedir, '.codeium', 'windsurf', 'mcp_config.json');
    }
}
export class CursorDesktopMpcDiscoveryAdapter extends ClaudeDesktopMpcDiscoveryAdapter {
    constructor(remoteAuthority) {
        super(remoteAuthority);
        this.discoverySource = "cursor-global" /* DiscoverySource.CursorGlobal */;
        this.id = `cursor.${this.remoteAuthority}`;
    }
    getFilePath({ homedir }) {
        return URI.joinPath(homedir, '.cursor', 'mcp.json');
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmF0aXZlTWNwRGlzY292ZXJ5QWRhcHRlcnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL21jcC9jb21tb24vZGlzY292ZXJ5L25hdGl2ZU1jcERpc2NvdmVyeUFkYXB0ZXJzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBS2hHLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQWV2RCxNQUFNLFVBQVUsOEJBQThCLENBQUMsUUFBZ0IsRUFBRSxRQUFrQixFQUFFLEdBQVM7SUFDN0YsSUFBSSxNQVVILENBQUE7SUFFRCxJQUFJLENBQUM7UUFDSixNQUFNLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQTtJQUN6QyxDQUFDO0lBQUMsTUFBTSxDQUFDO1FBQ1IsT0FBTTtJQUNQLENBQUM7SUFFRCxPQUFPLE1BQU0sQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxFQUFnQyxFQUFFO1FBQzdGLE9BQU87WUFDTixFQUFFLEVBQUUsR0FBRyxRQUFRLElBQUksSUFBSSxFQUFFO1lBQ3pCLEtBQUssRUFBRSxJQUFJO1lBQ1gsTUFBTSxFQUFFLE1BQU0sQ0FBQyxHQUFHO2dCQUNqQixDQUFDLENBQUM7b0JBQ0EsSUFBSSxvQ0FBNEI7b0JBQ2hDLEdBQUcsRUFBRSxHQUFHLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUM7b0JBQzFCLE9BQU8sRUFBRSxFQUFFO2lCQUNYO2dCQUNGLENBQUMsQ0FBQztvQkFDQSxJQUFJLHNDQUE4QjtvQkFDbEMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxJQUFJLElBQUksRUFBRTtvQkFDdkIsT0FB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