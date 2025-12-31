/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { parse as parseUrl } from 'url';
import { isBoolean } from '../../../base/common/types.js';
function getSystemProxyURI(requestURL, env) {
    if (requestURL.protocol === 'http:') {
        return env.HTTP_PROXY || env.http_proxy || null;
    }
    else if (requestURL.protocol === 'https:') {
        return env.HTTPS_PROXY || env.https_proxy || env.HTTP_PROXY || env.http_proxy || null;
    }
    return null;
}
export async function getProxyAgent(rawRequestURL, env, options = {}) {
    const requestURL = parseUrl(rawRequestURL);
    const proxyURL = options.proxyUrl || getSystemProxyURI(requestURL, env);
    if (!proxyURL) {
        return null;
    }
    const proxyEndpoint = parseUrl(proxyURL);
    if (!/^https?:$/.test(proxyEndpoint.protocol || '')) {
        return null;
    }
    const opts = {
        host: proxyEndpoint.hostname || '',
        port: (proxyEndpoint.port ? +proxyEndpoint.port : 0) ||
            (proxyEndpoint.protocol === 'https' ? 443 : 80),
        auth: proxyEndpoint.auth,
        rejectUnauthorized: isBoolean(options.strictSSL) ? options.strictSSL : true,
    };
    if (requestURL.protocol === 'http:') {
        const { default: mod } = await import('http-proxy-agent');
        return new mod.HttpProxyAgent(proxyURL, opts);
    }
    else {
        const { default: mod } = await import('https-proxy-agent');
        return new mod.HttpsProxyAgent(proxyURL, opts);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJveHkuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9yZXF1ZXN0L25vZGUvcHJveHkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLEtBQUssSUFBSSxRQUFRLEVBQU8sTUFBTSxLQUFLLENBQUE7QUFDNUMsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBSXpELFNBQVMsaUJBQWlCLENBQUMsVUFBZSxFQUFFLEdBQXVCO0lBQ2xFLElBQUksVUFBVSxDQUFDLFFBQVEsS0FBSyxPQUFPLEVBQUUsQ0FBQztRQUNyQyxPQUFPLEdBQUcsQ0FBQyxVQUFVLElBQUksR0FBRyxDQUFDLFVBQVUsSUFBSSxJQUFJLENBQUE7SUFDaEQsQ0FBQztTQUFNLElBQUksVUFBVSxDQUFDLFFBQVEsS0FBSyxRQUFRLEVBQUUsQ0FBQztRQUM3QyxPQUFPLEdBQUcsQ0FBQyxXQUFXLElBQUksR0FBRyxDQUFDLFdBQVcsSUFBSSxHQUFHLENBQUMsVUFBVSxJQUFJLEdBQUcsQ0FBQyxVQUFVLElBQUksSUFBSSxDQUFBO0lBQ3RGLENBQUM7SUFFRCxPQUFPLElBQUksQ0FBQTtBQUNaLENBQUM7QUFPRCxNQUFNLENBQUMsS0FBSyxVQUFVLGFBQWEsQ0FDbEMsYUFBcUIsRUFDckIsR0FBdUIsRUFDdkIsVUFBb0IsRUFBRTtJQUV0QixNQUFNLFVBQVUsR0FBRyxRQUFRLENBQUMsYUFBYSxDQUFDLENBQUE7SUFDMUMsTUFBTSxRQUFRLEdBQUcsT0FBTyxDQUFDLFFBQVEsSUFBSSxpQkFBaUIsQ0FBQyxVQUFVLEVBQUUsR0FBRyxDQUFDLENBQUE7SUFFdkUsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO1FBQ2YsT0FBTyxJQUFJLENBQUE7SUFDWixDQUFDO0lBRUQsTUFBTSxhQUFhLEdBQUcsUUFBUSxDQUFDLFFBQVEsQ0FBQyxDQUFBO0lBRXhDLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxRQUFRLElBQUksRUFBRSxDQUFDLEVBQUUsQ0FBQztRQUNyRCxPQUFPLElBQUksQ0FBQTtJQUNaLENBQUM7SUFFRCxNQUFNLElBQUksR0FBRztRQUNaLElBQUksRUFBRSxhQUFhLENBQUMsUUFBUSxJQUFJLEVBQUU7UUFDbEMsSUFBSSxFQUNILENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDOUMsQ0FBQyxhQUFhLENBQUMsUUFBUSxLQUFLLE9BQU8sQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7UUFDaEQsSUFBSSxFQUFFLGFBQWEsQ0FBQyxJQUFJO1FBQ3hCLGtCQUFrQixFQUFFLFNBQVMsQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLElBQUk7S0FDM0UsQ0FBQTtJQUVELElBQUksVUFBVSxDQUFDLFFBQVEsS0FBSyxPQUFPLEVBQUUsQ0FBQztRQUNyQyxNQUFNLEVBQUUsT0FBTyxFQUFFLEdBQUcsRUFBRSxHQUFHLE1BQU0sTUFBTSxDQUFDLGtCQUFrQixDQUFDLENBQUE7UUFDekQsT0FBTyxJQUFJLEdBQUcsQ0FBQyxjQUFjLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxDQUFBO0lBQzlDLENBQUM7U0FBTSxDQUFDO1FBQ1AsTUFBTSxFQUFFLE9BQU8sRUFBRSxHQUFHLEVBQUUsR0FBRyxNQUFNLE1BQU0sQ0FBQyxtQkFBbUIsQ0FBQyxDQUFBO1FBQzFELE9BQU8sSUFBSSxHQUFHLENBQUMsZUFBZSxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsQ0FBQTtJQUMvQyxDQUFDO0FBQ0YsQ0FBQyJ9