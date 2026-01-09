/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { Disposable } from '../../../../base/common/lifecycle.js';
import { basename } from '../../../../base/common/path.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { ITerminalService } from './terminal.js';
let TerminalTelemetryContribution = class TerminalTelemetryContribution extends Disposable {
    static { this.ID = 'terminalTelemetry'; }
    constructor(terminalService, _telemetryService) {
        super();
        this._telemetryService = _telemetryService;
        this._register(terminalService.onDidCreateInstance(async (instance) => {
            // Wait for process ready so the shell launch config is fully resolved
            await instance.processReady;
            this._logCreateInstance(instance.shellLaunchConfig);
        }));
    }
    _logCreateInstance(shellLaunchConfig) {
        this._telemetryService.publicLog2('terminal/createInstance', {
            shellType: getSanitizedShellType(shellLaunchConfig),
            isReconnect: !!shellLaunchConfig.attachPersistentProcess,
            isCustomPtyImplementation: !!shellLaunchConfig.customPtyImplementation,
            isLoginShell: (typeof shellLaunchConfig.args === 'string'
                ? shellLaunchConfig.args.split(' ')
                : shellLaunchConfig.args)?.some((arg) => arg === '-l' || arg === '--login') ?? false,
        });
    }
};
TerminalTelemetryContribution = __decorate([
    __param(0, ITerminalService),
    __param(1, ITelemetryService)
], TerminalTelemetryContribution);
export { TerminalTelemetryContribution };
var AllowedShellType;
(function (AllowedShellType) {
    AllowedShellType["Unknown"] = "unknown";
    // Windows only
    AllowedShellType["CommandPrompt"] = "cmd";
    AllowedShellType["GitBash"] = "git-bash";
    AllowedShellType["WindowsPowerShell"] = "windows-powershell";
    AllowedShellType["Wsl"] = "wsl";
    // All platforms
    AllowedShellType["Bash"] = "bash";
    AllowedShellType["Csh"] = "csh";
    AllowedShellType["Dash"] = "dash";
    AllowedShellType["Fish"] = "fish";
    AllowedShellType["Ksh"] = "ksh";
    AllowedShellType["Nushell"] = "nu";
    AllowedShellType["Pwsh"] = "pwsh";
    AllowedShellType["Sh"] = "sh";
    AllowedShellType["Ssh"] = "ssh";
    AllowedShellType["Tcsh"] = "tcsh";
    AllowedShellType["Tmux"] = "tmux";
    AllowedShellType["Zsh"] = "zsh";
    // Lanugage REPLs
    AllowedShellType["Julia"] = "julia";
    AllowedShellType["Node"] = "node";
    AllowedShellType["Python"] = "python";
    AllowedShellType["RubyIrb"] = "irb";
})(AllowedShellType || (AllowedShellType = {}));
// Types that match the executable name directly
const shellTypeExecutableAllowList = new Set([
    "cmd" /* AllowedShellType.CommandPrompt */,
    "wsl" /* AllowedShellType.Wsl */,
    "bash" /* AllowedShellType.Bash */,
    "csh" /* AllowedShellType.Csh */,
    "dash" /* AllowedShellType.Dash */,
    "fish" /* AllowedShellType.Fish */,
    "ksh" /* AllowedShellType.Ksh */,
    "nu" /* AllowedShellType.Nushell */,
    "pwsh" /* AllowedShellType.Pwsh */,
    "sh" /* AllowedShellType.Sh */,
    "ssh" /* AllowedShellType.Ssh */,
    "tcsh" /* AllowedShellType.Tcsh */,
    "tmux" /* AllowedShellType.Tmux */,
    "zsh" /* AllowedShellType.Zsh */,
    "julia" /* AllowedShellType.Julia */,
    "node" /* AllowedShellType.Node */,
    "irb" /* AllowedShellType.RubyIrb */,
]);
// Dynamic executables that map to a single type
const shellTypeExecutableRegexAllowList = [
    { regex: /^python(?:\d+(?:\.\d+)?)?$/i, type: "python" /* AllowedShellType.Python */ },
];
// Path-based look ups
const shellTypePathRegexAllowList = [
    // Git bash uses bash.exe, so look up based on the path
    { regex: /Git\\bin\\bash\.exe$/i, type: "git-bash" /* AllowedShellType.GitBash */ },
    // WindowsPowerShell should always be installed on this path, we cannot just look at the
    // executable name since powershell is the CLI on other platforms sometimes (eg. snap package)
    { regex: /WindowsPowerShell\\v1.0\\powershell.exe$/i, type: "windows-powershell" /* AllowedShellType.WindowsPowerShell */ },
    // WSL executables will represent some other shell in the end, but it's difficult to determine
    // when we log
    { regex: /Windows\\System32\\(?:bash|wsl)\.exe$/i, type: "wsl" /* AllowedShellType.Wsl */ },
];
function getSanitizedShellType(shellLaunchConfig) {
    if (!shellLaunchConfig.executable) {
        return "unknown" /* AllowedShellType.Unknown */;
    }
    const executableFile = basename(shellLaunchConfig.executable);
    const executableFileWithoutExt = executableFile.replace(/\.[^\.]+$/, '');
    for (const entry of shellTypePathRegexAllowList) {
        if (entry.regex.test(shellLaunchConfig.executable)) {
            return entry.type;
        }
    }
    for (const entry of shellTypeExecutableRegexAllowList) {
        if (entry.regex.test(executableFileWithoutExt)) {
            return entry.type;
        }
    }
    if (shellTypeExecutableAllowList.has(executableFileWithoutExt)) {
        return executableFileWithoutExt;
    }
    return "unknown" /* AllowedShellType.Unknown */;
}
