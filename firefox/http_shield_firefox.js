/** \file
 * \brief This file contains Firefox-specific functions for Network Boundary Shield.
 *
 *  \author Copyright (C) 2020  Pavel Pohner
 *  \author Copyright (C) 2020-2021 Martin Bednář
 *
 *  \license SPDX-License-Identifier: GPL-3.0-or-later
 */
//
//  This program is free software: you can redistribute it and/or modify
//  it under the terms of the GNU General Public License as published by
//  the Free Software Foundation, either version 3 of the License, or
//  (at your option) any later version.
//
//  This program is distributed in the hope that it will be useful,
//  but WITHOUT ANY WARRANTY; without even the implied warranty of
//  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
//  GNU General Public License for more details.
//
//  You should have received a copy of the GNU General Public License
//  along with this program.  If not, see <https://www.gnu.org/licenses/>.
//

/** \file
 *
 * \brief This file contains Firefox specific functions for Network Boundary Shield.
 *
 * \ingroup NBS
 *
 * This file contains webRequest API listeners. These listeners handle HTTP requests in the "before send headers" phase
 * and handle messages (on message event).
 *
 * NBS for Firefox uses the DNS web extension API to resolve domain names. As the domain names are
 * cached and needs to be resolved without NBS, the performance impact should be negligible.
 */

/**
 * The event listener, hooked up to webRequest onBeforeSendHeaders event.
 * Receives detail of HTTP request in requestDetail.
 * Catches the request, analyzes its origin and target URLs and blocks it/permits it based
 * on their IP adresses. Requests coming from public IP ranges targeting the private IPs are
 * blocked by default. Others are permitted by default.
 *
 * \param requestDetail Details of HTTP request.
 */
async function beforeSendHeadersListener(requestDetail)
{
	//If either of information is undefined, permit it
	//originUrl happens to be undefined for the first request of the page loading the document itself
	if (requestDetail.originUrl === undefined || requestDetail.url === undefined || requestDetail.originUrl === "null" || requestDetail.url === "null")
	{
		return {cancel:false};
	}
	var sourceDomain = getSiteForURL(requestDetail.originUrl);
	var fullSourceDomain = new URL(requestDetail.originUrl).hostname;

	var targetDomain = getSiteForURL(requestDetail.url);
	var fullTargetDomain = new URL(requestDetail.url).hostname;

	var targetIP;
	var sourceIP;
	var isSourcePrivate = false;
	var isDestinationPrivate = false;
	var destinationResolution = "";
	var sourceResolution = "";

	//Host found among user's trusted hosts, allow it right away
	if (isNbsWhitelisted(sourceDomain))
	{
		return {cancel:false};
	}

	//Checking type of SOURCE URL
	if (isIPV4(sourceDomain)) //SOURCE is IPV4 adddr
	{
		//Checking privacy of IPv4
		if (isIPV4Private(sourceDomain))
		{
			//Source is IPv4 private
			isSourcePrivate = true;
		}
	}
	else if(isIPV6(sourceDomain)) //SOURCE is IPV6
	{
		//Checking privacy of IPv6
		if (isIPV6Private(sourceDomain))
		{
			//Source is IPv6 private
			isSourcePrivate = true;
		}
	}
	else //SOURCE is hostname
	{
		//Resoluting DNS query for source domain
		sourceResolution = browser.dns.resolve(fullSourceDomain).then((val) =>
		{
			//Assigning source IPs
			sourceIP = val;
			//More IPs could have been found, for each of them
			for (let ip of sourceIP.addresses)
			{
				//Check whether it's IPv4
				if (isIPV4(ip))
				{
					if (isIPV4Private(ip))
					{
						//Source is IPv4 private
						isSourcePrivate = true;
					}
				}
				else if (isIPV6(ip))
				{
					if (isIPV6Private(ip))
					{
						//Source is IPv6 private
						isSourcePrivate = true;
					}
				}
			}
		});
	}

	//Analyzing targetDomain
	//Check IPv4/IPv6 and privacy
	if (isIPV4(targetDomain))
	{
		if (isIPV4Private(targetDomain))
		{
			isDestinationPrivate = true;

		}
	}
	else if(isIPV6(targetDomain))
	{
		if (isIPV6Private(targetDomain))
		{
			isDestinationPrivate = true;
		}
	}
	else //Target is hostname
	{
		//Resoluting DNS query for destination domain
		destinationResolution = browser.dns.resolve(fullTargetDomain).then((val) =>
		{
			//Assigning source IPs
			targetIP = val;
			//More IPs could have been found, for each of them
			for (let ip of targetIP.addresses)
			{
				//Check whether it's IPv4
				if (isIPV4(ip))
				{
					if (isIPV4Private(ip))
					{
						//Destination is IPv4 private
						isDestinationPrivate = true;
					}
				}
				else if (isIPV6(ip))
				{
					if (isIPV6Private(ip))
					{
						//Destination is IPv6 private
						isDestinationPrivate = true;
					}
				}
			}
		});
	}
	//Wait till all DNS resolutions are done, because its neccessary for upcoming actions
	await Promise.all([sourceResolution, destinationResolution]);

	//Blocking direction Public -> Private
	if (!isSourcePrivate && isDestinationPrivate)
	{
		notifyBlockedRequest(sourceDomain, targetDomain, requestDetail.tabId);
		return {cancel: nbsSettings.blocking ? true : false}
	}
	else //Permitting others
	{
		return {cancel: false};
	}
}
