"""
Session & Device Parsing Utilities for RicozBooks Security.
Parses User-Agent strings and network requests into friendly device, browser, and OS names.
"""
from fastapi import Request

def parse_user_agent(ua_string: str) -> dict:
    ua = ua_string or ""
    
    # 1. Operating System
    os = "Unknown OS"
    if "Windows NT 10.0" in ua or "Windows NT 11.0" in ua:
        os = "Windows 10/11"
    elif "Windows" in ua:
        os = "Windows"
    elif "iPhone" in ua:
        os = "iOS (iPhone)"
    elif "iPad" in ua:
        os = "iPadOS"
    elif "Macintosh" in ua or "Mac OS X" in ua:
        os = "macOS"
    elif "Android" in ua:
        os = "Android"
    elif "Linux" in ua:
        os = "Linux"

    # 2. Browser
    browser = "Web Browser"
    if "Edg/" in ua or "Edge/" in ua:
        browser = "Microsoft Edge"
    elif "Chrome/" in ua and "Safari/" in ua:
        browser = "Google Chrome"
    elif "Firefox/" in ua:
        browser = "Mozilla Firefox"
    elif "Safari/" in ua and "Chrome/" not in ua:
        browser = "Apple Safari"
    elif "OPR/" in ua or "Opera/" in ua:
        browser = "Opera"

    # 3. Device Category
    device = "Desktop PC"
    if "iPhone" in ua:
        device = "iPhone"
    elif "iPad" in ua:
        device = "iPad"
    elif "Android" in ua and "Mobile" in ua:
        device = "Android Phone"
    elif "Android" in ua:
        device = "Android Tablet"
    elif "Mobile" in ua:
        device = "Mobile Device"
    elif "Macintosh" in ua:
        device = "Mac Desktop/Laptop"
    elif "Windows" in ua:
        device = "Windows PC"
    elif "Linux" in ua:
        device = "Linux Workstation"

    return {
        "os": os,
        "browser": browser,
        "device": device
    }

def get_client_ip(request: Request) -> str:
    # Check X-Forwarded-For header if behind reverse proxy/load balancer
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        parts = [p.strip() for p in forwarded.split(",")]
        if parts and parts[0]:
            return parts[0]
    if request.client and request.client.host:
        return request.client.host
    return "127.0.0.1"

def get_approx_location(request: Request) -> str:
    # 1. Cloudflare / Cloud load balancer geolocation headers
    city = request.headers.get("cf-ipcity") or request.headers.get("x-vercel-ip-city")
    region = request.headers.get("cf-region") or request.headers.get("cf-ipregion")
    country = request.headers.get("cf-ipcountry") or request.headers.get("x-vercel-ip-country")
    
    if city and country:
        return f"{city}, {country}"
    if region and country:
        return f"{region}, {country}"
    if country:
        return f"{country}"

    # 2. Local network or dev fallback
    ip = get_client_ip(request)
    if ip in ("127.0.0.1", "::1", "localhost") or ip.startswith("192.168.") or ip.startswith("10."):
        return "Bangalore, India" # Ricoz headquarters context
    
    return "India"
