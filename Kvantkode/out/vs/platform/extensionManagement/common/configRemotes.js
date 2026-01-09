/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { URI } from '../../../base/common/uri.js';
const SshProtocolMatcher = /^([^@:]+@)?([^:]+):/;
const SshUrlMatcher = /^([^@:]+@)?([^:]+):(.+)$/;
const AuthorityMatcher = /^([^@]+@)?([^:]+)(:\d+)?$/;
const SecondLevelDomainMatcher = /([^@:.]+\.[^@:.]+)(:\d+)?$/;
const RemoteMatcher = /^\s*url\s*=\s*(.+\S)\s*$/gm;
const AnyButDot = /[^.]/g;
export const AllowedSecondLevelDomains = [
    'github.com',
    'bitbucket.org',
    'visualstudio.com',
    'gitlab.com',
    'heroku.com',
    'azurewebsites.net',
    'ibm.com',
    'amazon.com',
    'amazonaws.com',
    'cloudapp.net',
    'rhcloud.com',
    'google.com',
    'azure.com',
];
function stripLowLevelDomains(domain) {
    const match = domain.match(SecondLevelDomainMatcher);
    return match ? match[1] : null;
}
function extractDomain(url) {
    if (url.indexOf('://') === -1) {
        const match = url.match(SshProtocolMatcher);
        if (match) {
            return stripLowLevelDomains(match[2]);
        }
        else {
            return null;
        }
    }
    try {
        const uri = URI.parse(url);
        if (uri.authority) {
            return stripLowLevelDomains(uri.authority);
        }
    }
    catch (e) {
        // ignore invalid URIs
    }
    return null;
}
export function getDomainsOfRemotes(text, allowedDomains) {
    const domains = new Set();
    let match;
    while ((match = RemoteMatcher.exec(text))) {
        const domain = extractDomain(match[1]);
        if (domain) {
            domains.add(domain);
        }
    }
    const allowedDomainsSet = new Set(allowedDomains);
    return Array.from(domains).map((key) => allowedDomainsSet.has(key) ? key : key.replace(AnyButDot, 'a'));
}
function stripPort(authority) {
    const match = authority.match(AuthorityMatcher);
    return match ? match[2] : null;
}
function normalizeRemote(host, path, stripEndingDotGit) {
    if (host && path) {
        if (stripEndingDotGit && path.endsWith('.git')) {
            path = path.substr(0, path.length - 4);
        }
        return path.indexOf('/') === 0 ? `${host}${path}` : `${host}/${path}`;
    }
    return null;
}
function extractRemote(url, stripEndingDotGit) {
    if (url.indexOf('://') === -1) {
        const match = url.match(SshUrlMatcher);
        if (match) {
            return normalizeRemote(match[2], match[3], stripEndingDotGit);
        }
    }
    try {
        const uri = URI.parse(url);
        if (uri.authority) {
            return normalizeRemote(stripPort(uri.authority), uri.path, stripEndingDotGit);
        }
    }
    catch (e) {
        // ignore invalid URIs
    }
    return null;
}
export function getRemotes(text, stripEndingDotGit = false) {
    const remotes = [];
    let match;
    while ((match = RemoteMatcher.exec(text))) {
        const remote = extractRemote(match[1], stripEndingDotGit);
        if (remote) {
            remotes.push(remote);
        }
    }
    return remotes;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlnUmVtb3Rlcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vZXh0ZW5zaW9uTWFuYWdlbWVudC9jb21tb24vY29uZmlnUmVtb3Rlcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFFakQsTUFBTSxrQkFBa0IsR0FBRyxxQkFBcUIsQ0FBQTtBQUNoRCxNQUFNLGFBQWEsR0FBRywwQkFBMEIsQ0FBQTtBQUNoRCxNQUFNLGdCQUFnQixHQUFHLDJCQUEyQixDQUFBO0FBQ3BELE1BQU0sd0JBQXdCLEdBQUcsNEJBQTRCLENBQUE7QUFDN0QsTUFBTSxhQUFhLEdBQUcsNEJBQTRCLENBQUE7QUFDbEQsTUFBTSxTQUFTLEdBQUcsT0FBTyxDQUFBO0FBRXpCLE1BQU0sQ0FBQyxNQUFNLHlCQUF5QixHQUFHO0lBQ3hDLFlBQVk7SUFDWixlQUFlO0lBQ2Ysa0JBQWtCO0lBQ2xCLFlBQVk7SUFDWixZQUFZO0lBQ1osbUJBQW1CO0lBQ25CLFNBQVM7SUFDVCxZQUFZO0lBQ1osZUFBZTtJQUNmLGNBQWM7SUFDZCxhQUFhO0lBQ2IsWUFBWTtJQUNaLFdBQVc7Q0FDWCxDQUFBO0FBRUQsU0FBUyxvQkFBb0IsQ0FBQyxNQUFjO0lBQzNDLE1BQU0sS0FBSyxHQUFHLE1BQU0sQ0FBQyxLQUFLLENBQUMsd0JBQXdCLENBQUMsQ0FBQTtJQUNwRCxPQUFPLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUE7QUFDL0IsQ0FBQztBQUVELFNBQVMsYUFBYSxDQUFDLEdBQVc7SUFDakMsSUFBSSxHQUFHLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxLQUFLLENB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