/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { env } from './process.js';
// Define the enumeration for Desktop Environments
var DesktopEnvironment;
(function (DesktopEnvironment) {
    DesktopEnvironment["UNKNOWN"] = "UNKNOWN";
    DesktopEnvironment["CINNAMON"] = "CINNAMON";
    DesktopEnvironment["DEEPIN"] = "DEEPIN";
    DesktopEnvironment["GNOME"] = "GNOME";
    DesktopEnvironment["KDE3"] = "KDE3";
    DesktopEnvironment["KDE4"] = "KDE4";
    DesktopEnvironment["KDE5"] = "KDE5";
    DesktopEnvironment["KDE6"] = "KDE6";
    DesktopEnvironment["PANTHEON"] = "PANTHEON";
    DesktopEnvironment["UNITY"] = "UNITY";
    DesktopEnvironment["XFCE"] = "XFCE";
    DesktopEnvironment["UKUI"] = "UKUI";
    DesktopEnvironment["LXQT"] = "LXQT";
})(DesktopEnvironment || (DesktopEnvironment = {}));
const kXdgCurrentDesktopEnvVar = 'XDG_CURRENT_DESKTOP';
const kKDESessionEnvVar = 'KDE_SESSION_VERSION';
export function getDesktopEnvironment() {
    const xdgCurrentDesktop = env[kXdgCurrentDesktopEnvVar];
    if (xdgCurrentDesktop) {
        const values = xdgCurrentDesktop
            .split(':')
            .map((value) => value.trim())
            .filter((value) => value.length > 0);
        for (const value of values) {
            switch (value) {
                case 'Unity': {
                    const desktopSessionUnity = env['DESKTOP_SESSION'];
                    if (desktopSessionUnity && desktopSessionUnity.includes('gnome-fallback')) {
                        return DesktopEnvironment.GNOME;
                    }
                    return DesktopEnvironment.UNITY;
                }
                case 'Deepin':
                    return DesktopEnvironment.DEEPIN;
                case 'GNOME':
                    return DesktopEnvironment.GNOME;
                case 'X-Cinnamon':
                    return DesktopEnvironment.CINNAMON;
                case 'KDE': {
                    const kdeSession = env[kKDESessionEnvVar];
                    if (kdeSession === '5') {
                        return DesktopEnvironment.KDE5;
                    }
                    if (kdeSession === '6') {
                        return DesktopEnvironment.KDE6;
                    }
                    return DesktopEnvironment.KDE4;
                }
                case 'Pantheon':
                    return DesktopEnvironment.PANTHEON;
                case 'XFCE':
                    return DesktopEnvironment.XFCE;
                case 'UKUI':
                    return DesktopEnvironment.UKUI;
                case 'LXQt':
                    return DesktopEnvironment.LXQT;
            }
        }
    }
    const desktopSession = env['DESKTOP_SESSION'];
    if (desktopSession) {
        switch (desktopSession) {
            case 'deepin':
                return DesktopEnvironment.DEEPIN;
            case 'gnome':
            case 'mate':
                return DesktopEnvironment.GNOME;
            case 'kde4':
            case 'kde-plasma':
                return DesktopEnvironment.KDE4;
            case 'kde':
                if (kKDESessionEnvVar in env) {
                    return DesktopEnvironment.KDE4;
                }
                return DesktopEnvironment.KDE3;
            case 'xfce':
            case 'xubuntu':
                return DesktopEnvironment.XFCE;
            case 'ukui':
                return DesktopEnvironment.UKUI;
        }
    }
    if ('GNOME_DESKTOP_SESSION_ID' in env) {
        return DesktopEnvironment.GNOME;
    }
    if ('KDE_FULL_SESSION' in env) {
        if (kKDESessionEnvVar in env) {
            return DesktopEnvironment.KDE4;
        }
        return DesktopEnvironment.KDE3;
    }
    return DesktopEnvironment.UNKNOWN;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVza3RvcEVudmlyb25tZW50SW5mby5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvY29tbW9uL2Rlc2t0b3BFbnZpcm9ubWVudEluZm8udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGNBQWMsQ0FBQTtBQUVsQyxrREFBa0Q7QUFDbEQsSUFBSyxrQkFjSjtBQWRELFdBQUssa0JBQWtCO0lBQ3RCLHlDQUFtQixDQUFBO0lBQ25CLDJDQUFxQixDQUFBO0lBQ3JCLHVDQUFpQixDQUFBO0lBQ2pCLHFDQUFlLENBQUE7SUFDZixtQ0FBYSxDQUFBO0lBQ2IsbUNBQWEsQ0FBQTtJQUNiLG1DQUFhLENBQUE7SUFDYixtQ0FBYSxDQUFBO0lBQ2IsMkNBQXFCLENBQUE7SUFDckIscUNBQWUsQ0FBQTtJQUNmLG1DQUFhLENBQUE7SUFDYixtQ0FBYSxDQUFBO0lBQ2IsbUNBQWEsQ0FBQTtBQUNkLENBQUMsRUFkSSxrQkFBa0IsS0FBbEIsa0JBQWtCLFFBY3RCO0FBRUQsTUFBTSx3QkFBd0IsR0FBRyxxQkFBcUIsQ0FBQTtBQUN0RCxNQUFNLGlCQUFpQixHQUFHLHFCQUFxQixDQUFBO0FBRS9DLE1BQU0sVUFBVSxxQkFBcUI7SUFDcEMsTUFBTSxpQkFBaUIsR0FBRyxHQUFHLENBQUMsd0JBQXdCLENBQUMsQ0FBQTtJQUN2RCxJQUFJLGlCQUFpQixFQUFFLENBQUM7UUFDdkIsTUFBTSxNQUFNLEdBQUcsaUJBQWlCO2FBQzlCLEtBQUssQ0FBQyxHQUFHLENBQUM7YUFDVixHQUFHLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQzthQUM1QixNQUFNLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLEtBQUssQ0FBQyxNQUFNLEdBQUcsQ0FB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