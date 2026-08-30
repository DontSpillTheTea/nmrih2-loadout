import urllib.request, re, json, hashlib, time, os

base_pub_html = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRYRiLDS0qkszc2GgVRzTiNy46i-JaatWB2qbgsufwzwpCbyZCBqcaQ3avoYnLEAiif-ZYJLD-OD5rW/pubhtml"
base_pub_csv = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRYRiLDS0qkszc2GgVRzTiNy46i-JaatWB2qbgsufwzwpCbyZCBqcaQ3avoYnLEAiif-ZYJLD-OD5rW/pub?gid={gid}&single=true&output=csv"

os.makedirs("data/raw/tabs", exist_ok=True)
headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}

print("1. Fetching published HTML index...")
req = urllib.request.Request(base_pub_html, headers=headers)
with urllib.request.urlopen(req, timeout=20) as resp:
    html_content = resp.read().decode('utf-8')
    with open("data/raw/compendium.html", "w", encoding="utf-8") as out:
        out.write(html_content)

matches = re.findall(r"name:\s*\"([^\"]+)\",\s*pageUrl:\s*\"([^\"]+)\"", html_content)
tabs = []
for name, url in matches:
    url = url.replace("\\/", "/")
    gid_m = re.search(r"gid=([0-9]+)", url)
    gid = gid_m.group(1) if gid_m else "0"
    clean_name = re.sub(r"[^\w\-_\. ]", "_", name).strip()
    tabs.append({"name": name, "clean_name": clean_name, "gid": gid})

manifest = {
    "fetchedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    "source": base_pub_html,
    "files": []
}

print(f"2. Fetching {len(tabs)} discovered tabs as raw CSVs...")
for tab in tabs:
    gid = tab["gid"]
    cname = tab["clean_name"]
    tname = tab["name"]
    csv_url = base_pub_csv.format(gid=gid)
    target_csv = f"data/raw/tabs/{cname}_{gid}.csv"
    req = urllib.request.Request(csv_url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            content = resp.read()
            with open(target_csv, "wb") as out:
                out.write(content)
            sha = hashlib.sha256(content).hexdigest()
            manifest["files"].append({
                "tabName": tname,
                "gid": gid,
                "path": target_csv,
                "sha256": sha,
                "sizeBytes": len(content)
            })
            print(f"  -> Saved {tname} ({len(content)} bytes, sha256={sha[:8]})")
    except Exception as e:
        print(f"  -> Error fetching {tname}: {e}")

with open("data/raw/manifest.json", "w", encoding="utf-8") as f:
    json.dump(manifest, f, indent=2)

print("Data fetch complete. Manifest written to data/raw/manifest.json")
