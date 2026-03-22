import os
import json
import time
import requests
import random
import string  # 🚀 新增：用于识别所有标准英文标点符号
from PIL import Image
from io import BytesIO

# ==========================================
# ⚙️ 配置区
# ==========================================
TARGET_COUNT = 500 
FOLDER_PATH = "./assets/museum_frames"
DB_FILE = "./assets/museumDB.js"

# 🚀 优化 1：画质上限拉满！从 600 改为 1920 (适配大部分 1080p/2K 屏幕)
MAX_SIZE = 1920 

if not os.path.exists(FOLDER_PATH):
    os.makedirs(FOLDER_PATH)

print("🔍 正在连接大都会艺术博物馆 (The Met) 开放 API...")
search_url = "https://collectionapi.metmuseum.org/public/collection/v1/search?hasImages=true&isPublicDomain=true&medium=Paintings&q=paintings"
search_res = requests.get(search_url)

if search_res.status_code != 200:
    print(f"❌ 搜索请求失败，状态码: {search_res.status_code}")
    exit()

object_ids = search_res.json().get("objectIDs", [])
print(f"✅ 找到 {len(object_ids)} 件匹配藏品，开始挑选并下载前 {TARGET_COUNT} 张高清大图...\n")

museum_db = []
downloaded_count = 0

# 定义需要拦截的所有标点符号合集（包含所有英文标点 + 常见中文标点）
FORBIDDEN_PUNCTUATIONS = string.punctuation + "，。！？；：‘’“”（）【】、·《》"

for obj_id in object_ids:
    if downloaded_count >= TARGET_COUNT:
        break
        
    try:
        time.sleep(random.uniform(0.5, 2.0))
        
        detail_url = f"https://collectionapi.metmuseum.org/public/collection/v1/objects/{obj_id}"
        detail_res = requests.get(detail_url, timeout=10)
        
        if detail_res.status_code != 200:
            continue
            
        obj_data = detail_res.json()
        
        # 🛑 过滤 1：排除 department 中包含 Asian 的艺术品
        department = obj_data.get("department", "")
        if "Asian" in department:
            continue
            
        # 🛑 过滤 2：过滤 title 超过 45 个字，或包含括号和冒号的艺术品
        raw_title = str(obj_data.get("title", "Untitled"))
        if len(raw_title) > 45:
            continue
            
        forbidden_title_chars = ['(', ')', ':', '（', '）', '：']
        if any(char in raw_title for char in forbidden_title_chars):
            continue
            
        objectEndDate = obj_data.get("objectEndDate", "")

        # 🛑 过滤 3：获取艺术家姓名并进行长度与标点限制
        artist_name = str(obj_data.get("artistDisplayName", "Unknown")).strip()
        
        # 限制长度不超过 35 个字符
        if len(artist_name) > 35:
            continue
            
        # 限制不能包含任何标点符号（注：空格不属于标点，正常英文名带空格没问题）
        if any(char in FORBIDDEN_PUNCTUATIONS for char in artist_name):
            continue
            
        # 🚀 优化 2：把获取逻辑反过来！优先拿高清大图 (primaryImage)
        img_url = obj_data.get("primaryImage") or obj_data.get("primaryImageSmall")
        title = raw_title.replace("/", "_").replace("\\", "_")
        
        if not img_url:
            continue
            
        print(f"[{downloaded_count + 1}/{TARGET_COUNT}] ⬇️ 下载高清图: {title[:15]}... | 👩‍🎨 {artist_name}")
        
        img_response = requests.get(img_url, timeout=15)
        if img_response.status_code != 200:
            continue
            
        img = Image.open(BytesIO(img_response.content))
        
        if img.mode != 'RGB':
            img = img.convert('RGB')
            
        # 等比缩放到 1920
        img.thumbnail((MAX_SIZE, MAX_SIZE), Image.Resampling.LANCZOS)
        
        filename = f"MET_{obj_id}.jpg"
        filepath = os.path.join(FOLDER_PATH, filename)
        
        # 🚀 优化 3：稍微提高一点 JPEG 压缩质量
        img.save(filepath, "JPEG", quality=90)
        
        w, h = img.size
        ratio = round(w / h, 4)
        
        # 🛑 写入数据库
        museum_db.append({
            "name": filename,
            "title": title,
            "artistDisplayName": artist_name,
            "ratioVal": ratio,
            "objectEndDate": objectEndDate,
            "w": w,
            "h": h
        })
        
        downloaded_count += 1
        
    except requests.exceptions.Timeout:
        print(f"⚠️ ID {obj_id} 请求超时，跳过...")
    except json.decoder.JSONDecodeError:
        print(f"⚠️ ID {obj_id} 返回了非 JSON 数据，跳过...")
    except Exception as e:
        print(f"⚠️ ID {obj_id} 发生未知错误: {e}，跳过...")
        continue

museum_db.sort(key=lambda x: x["ratioVal"])

# 🚀 优化 4：直接生成 window.museumDB
with open(DB_FILE, "w", encoding="utf-8") as f:
    f.write("window.museumDB = " + json.dumps(museum_db, indent=4, ensure_ascii=False) + ";\n")

print(f"\n🎉 大功告成！成功处理 {downloaded_count} 张符合所有严苛条件的高清画作！")