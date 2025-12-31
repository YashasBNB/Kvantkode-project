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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlnUmVtb3Rlcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2V4dGVuc2lvbk1hbmFnZW1lbnQvY29tbW9uL2NvbmZpZ1JlbW90ZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBRWpELE1BQU0sa0JBQWtCLEdBQUcscUJBQXFCLENBQUE7QUFDaEQsTUFBTSxhQUFhLEdBQUcsMEJBQTBCLENBQUE7QUFDaEQsTUFBTSxnQkFBZ0IsR0FBRywyQkFBMkIsQ0FBQTtBQUNwRCxNQUFNLHdCQUF3QixHQUFHLDRCQUE0QixDQUFBO0FBQzdELE1BQU0sYUFBYSxHQUFHLDRCQUE0QixDQUFBO0FBQ2xELE1BQU0sU0FBUyxHQUFHLE9BQU8sQ0FBQTtBQUV6QixNQUFNLENBQUMsTUFBTSx5QkFBeUIsR0FBRztJQUN4QyxZQUFZO0lBQ1osZUFBZTtJQUNmLGtCQUFrQjtJQUNsQixZQUFZO0lBQ1osWUFBWTtJQUNaLG1CQUFtQjtJQUNuQixTQUFTO0lBQ1QsWUFBWTtJQUNaLGVBQWU7SUFDZixjQUFjO0lBQ2QsYUFBYTtJQUNiLFlBQVk7SUFDWixXQUFXO0NBQ1gsQ0FBQTtBQUVELFNBQVMsb0JBQW9CLENBQUMsTUFBYztJQUMzQyxNQUFNLEtBQUssR0FBRyxNQUFNLENBQUMsS0FBSyxDQUFDLHdCQUF3QixDQUFDLENBQUE7SUFDcEQsT0FBTyxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFBO0FBQy9CLENBQUM7QUFFRCxTQUFTLGFBQWEsQ0FBQyxHQUFXO0lBQ2pDLElBQUksR0FBRyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDO1FBQy9C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