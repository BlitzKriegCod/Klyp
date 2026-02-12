
import requests
from bs4 import BeautifulSoup
import urllib.parse
import re

def search_ok_ru(query):
    # Try direct video search URL
    # https://ok.ru/video/search?cmd=search&st.search=nature
    url = "https://ok.ru/video/search"
    params = {
        "cmd": "search",
        "st.search": query,
    }
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    }
    
    try:
        response = requests.get(url, params=params, headers=headers)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.text, 'html.parser')
        
        print(f"Page Title: {soup.title.string.strip() if soup.title else 'No Title'}")
        
        results = []
        # Inspect for video links
        links = soup.find_all('a', href=re.compile(r'/video/\d+'))
        print(f"Found {len(links)} potential video links")
        
        seen_ids = set()
        for link in links:
            href = link.get('href')
            match = re.search(r'/video/(\d+)', href)
            if match:
                vid_id = match.group(1)
                if vid_id in seen_ids:
                    continue
                seen_ids.add(vid_id)
                
                title = link.get_text(strip=True) or link.get('title')
                if not title:
                    img = link.find('img')
                    if img:
                        title = img.get('alt')
                
                title = title or f"Video {vid_id}"
                
                results.append({
                    "id": vid_id,
                    "url": f"https://ok.ru/video/{vid_id}",
                    "title": title
                })
        
        if results:
            return results[:10]

        # Fallback: DuckDuckGo Search
        print("Direct search failed. Trying DuckDuckGo...")
        ddg_url = "https://html.duckduckgo.com/html/"
        ddg_params = {
            "q": f"site:ok.ru/video {query}"
        }
        
        headers['Referer'] = 'https://html.duckduckgo.com/'
        
        resp = requests.post(ddg_url, data=ddg_params, headers=headers)
        resp.raise_for_status()
        
        soup = BeautifulSoup(resp.text, 'html.parser')
        
        # DDG results are usually in 'div.result' -> 'a.result__a'
        ddg_links = soup.select('a.result__a')
        print(f"Found {len(ddg_links)} DDG results")
        
        for link in ddg_links:
            href = link.get('href')
            # Extract actual URL from DDG redirect
            # Usually href is relative or absolute to ddg
            # Actually html.duckduckgo.com returns direct links often or redirects
            # But let's check
            
            # Decode URL if it is a DDG redirect
            if "uddg=" in href:
                # url is inside uddg parameter
                parsed = urllib.parse.urlparse(href)
                qs = urllib.parse.parse_qs(parsed.query)
                if 'uddg' in qs:
                    href = qs['uddg'][0]
            
            if "ok.ru/video/" in href:
                 match = re.search(r'ok\.ru/video/(\d+)', href)
                 if match:
                     vid_id = match.group(1)
                     if vid_id in seen_ids:
                        continue
                     seen_ids.add(vid_id)
                     
                     title = link.get_text(strip=True)
                     results.append({
                        "id": vid_id,
                        "url": f"https://ok.ru/video/{vid_id}",
                        "title": title
                     })
                     
        return results[:10]

    except Exception as e:
        print(f"Error: {e}")
        return []

if __name__ == "__main__":
    results = search_ok_ru("nature")
    print(f"Found {len(results)} videos:")
    for res in results:
        print(res)
