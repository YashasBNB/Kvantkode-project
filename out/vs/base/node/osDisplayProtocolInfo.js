/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { constants as FSConstants, promises as FSPromises } from 'fs';
import { join } from '../common/path.js';
import { env } from '../common/process.js';
const XDG_SESSION_TYPE = 'XDG_SESSION_TYPE';
const WAYLAND_DISPLAY = 'WAYLAND_DISPLAY';
const XDG_RUNTIME_DIR = 'XDG_RUNTIME_DIR';
var DisplayProtocolType;
(function (DisplayProtocolType) {
    DisplayProtocolType["Wayland"] = "wayland";
    DisplayProtocolType["XWayland"] = "xwayland";
    DisplayProtocolType["X11"] = "x11";
    DisplayProtocolType["Unknown"] = "unknown";
})(DisplayProtocolType || (DisplayProtocolType = {}));
export async function getDisplayProtocol(errorLogger) {
    const xdgSessionType = env[XDG_SESSION_TYPE];
    if (xdgSessionType) {
        // If XDG_SESSION_TYPE is set, return its value if it's either 'wayland' or 'x11'.
        // We assume that any value other than 'wayland' or 'x11' is an error or unexpected,
        // hence 'unknown' is returned.
        return xdgSessionType === "wayland" /* DisplayProtocolType.Wayland */ ||
            xdgSessionType === "x11" /* DisplayProtocolType.X11 */
            ? xdgSessionType
            : "unknown" /* DisplayProtocolType.Unknown */;
    }
    else {
        const waylandDisplay = env[WAYLAND_DISPLAY];
        if (!waylandDisplay) {
            // If WAYLAND_DISPLAY is empty, then the session is x11.
            return "x11" /* DisplayProtocolType.X11 */;
        }
        else {
            const xdgRuntimeDir = env[XDG_RUNTIME_DIR];
            if (!xdgRuntimeDir) {
                // If XDG_RUNTIME_DIR is empty, then the session can only be guessed.
                return "unknown" /* DisplayProtocolType.Unknown */;
            }
            else {
                // Check for the presence of the file $XDG_RUNTIME_DIR/wayland-0.
                const waylandServerPipe = join(xdgRuntimeDir, 'wayland-0');
                try {
                    await FSPromises.access(waylandServerPipe, FSConstants.R_OK);
                    // If the file exists, then the session is wayland.
                    return "wayland" /* DisplayProtocolType.Wayland */;
                }
                catch (err) {
                    // If the file does not exist or an error occurs, we guess 'unknown'
                    // since WAYLAND_DISPLAY was set but no wayland-0 pipe could be confirmed.
                    errorLogger(err);
                    return "unknown" /* DisplayProtocolType.Unknown */;
                }
            }
        }
    }
}
export function getCodeDisplayProtocol(displayProtocol, ozonePlatform) {
    if (!ozonePlatform) {
        return displayProtocol === "wayland" /* DisplayProtocolType.Wayland */
            ? "xwayland" /* DisplayProtocolType.XWayland */
            : "x11" /* DisplayProtocolType.X11 */;
    }
    else {
        switch (ozonePlatform) {
            case 'auto':
                return displayProtocol;
            case 'x11':
                return displayProtocol === "wayland" /* DisplayProtocolType.Wayland */
                    ? "xwayland" /* DisplayProtocolType.XWayland */
                    : "x11" /* DisplayProtocolType.X11 */;
            case 'wayland':
                return "wayland" /* DisplayProtocolType.Wayland */;
            default:
                return "unknown" /* DisplayProtocolType.Unknown */;
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3NEaXNwbGF5UHJvdG9jb2xJbmZvLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9ub2RlL29zRGlzcGxheVByb3RvY29sSW5mby50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsU0FBUyxJQUFJLFdBQVcsRUFBRSxRQUFRLElBQUksVUFBVSxFQUFFLE1BQU0sSUFBSSxDQUFBO0FBQ3JFLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxtQkFBbUIsQ0FBQTtBQUN4QyxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sc0JBQXNCLENBQUE7QUFFMUMsTUFBTSxnQkFBZ0IsR0FBRyxrQkFBa0IsQ0FBQTtBQUMzQyxNQUFNLGVBQWUsR0FBRyxpQkFBaUIsQ0FBQTtBQUN6QyxNQUFNLGVBQWUsR0FBRyxpQkFBaUIsQ0FBQTtBQUV6QyxJQUFXLG1CQUtWO0FBTEQsV0FBVyxtQkFBbUI7SUFDN0IsMENBQW1CLENBQUE7SUFDbkIsNENBQXFCLENBQUE7SUFDckIsa0NBQVcsQ0FBQTtJQUNYLDBDQUFtQixDQUFBO0FBQ3BCLENBQUMsRUFMVSxtQkFBbUIsS0FBbkIsbUJBQW1CLFFBSzdCO0FBRUQsTUFBTSxDQUFDLEtBQUssVUFBVSxrQkFBa0IsQ0FDdkMsV0FBaUM7SUFFakMsTUFBTSxjQUFjLEdBQUcsR0FBRyxDQUFDLGdCQUFnQixDQUFDLENBQUE7SUFFNUMsSUFBSSxjQUFjLEVBQUUsQ0FBQztRQUNwQixrRkFBa0Y7UUFDbEYsb0ZBQW9GO1FBQ3BGLCtCQUErQjtRQUMvQixPQUFPLGNBQWMsZ0RBQWdDO1lBQ3BELGNBQWMsd0NBQTRCO1lBQzFDLENBQUMsQ0FBQyxjQUFjO1lBQ2hCLENBQUMsNENBQTRCLENBQUE7SUFDL0IsQ0FBQztTQUFNLENBQUM7UUFDUCxNQUFNLGNBQWMsR0FBRyxHQUFHLENBQUMsZUFBZSxDQUFDLENBQUE7UUFFM0MsSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDO1lBQ3JCLHdEQUF3RDtZQUN4RCwyQ0FBOEI7UUFDL0IsQ0FBQzthQUFNLENBQUM7WUFDUCxNQUFNLGFBQWEsR0FBRyxHQUFHLENBQUMsZUFBZSxDQUFDLENBQUE7WUFFMUMsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDO2dCQUNwQixxRUFBcUU7Z0JBQ3JFLG1EQUFrQztZQUNuQyxDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsaUVBQWlFO2dCQUNqRSxNQUFNLGlCQUFpQixHQUFHLElBQUksQ0FBQyxhQUFhLEVBQUUsV0FBVyxDQUFDLENBQUE7Z0JBRTFELElBQUksQ0FBQztvQkFDSixNQUFNLFVBQVUsQ0FBQyxNQUFNLENBQUMsaUJBQWlCLEVBQUUsV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFBO29CQUU1RCxtREFBbUQ7b0JBQ25ELG1EQUFrQztnQkFDbkMsQ0FBQztnQkFBQyxPQUFPLEdBQUcsRUFBRSxDQUFDO29CQUNkLG9FQUFvRTtvQkFDcEUsMEVBQTBFO29CQUMxRSxXQUFXLENBQUMsR0FBRyxDQUFDLENBQUE7b0JBQ2hCLG1EQUFrQztnQkFDbkMsQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQztBQUNGLENBQUM7QUFFRCxNQUFNLFVBQVUsc0JBQXNCLENBQ3JDLGVBQW9DLEVBQ3BDLGFBQWlDO0lBRWpDLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQztRQUNwQixPQUFPLGVBQWUsZ0RBQWdDO1lBQ3JELENBQUM7WUFDRCxDQUFDLG9DQUF3QixDQUFBO0lBQzNCLENBQUM7U0FBTSxDQUFDO1FBQ1AsUUFBUSxhQUFhLEVBQUUsQ0FBQztZQUN2QixLQUFLLE1BQU07Z0JBQ1YsT0FBTyxlQUFlLENBQUE7WUFDdkIsS0FBSyxLQUFLO2dCQUNULE9BQU8sZUFBZSxnREFBZ0M7b0JBQ3JELENBQUM7b0JBQ0QsQ0FBQyxvQ0FBd0IsQ0FBQTtZQUMzQixLQUFLLFNBQVM7Z0JBQ2IsbURBQWtDO1lBQ25DO2dCQUNDLG1EQUFrQztRQUNwQyxDQUFDO0lBQ0YsQ0FBQztBQUNGLENBQUMifQ==