import os
import json
from PIL import Image

# ==========================================
# ⚙️ 配置区
# ==========================================
FOLDER_PATH = "./assets/museum_frames"
DB_FILE = "./assets/museumDB.js"

museum_db = []

print("🔍 正在潜入仓库，扫描已下载的图片...")

# 遍历文件夹里的所有图片
for filename in os.listdir(FOLDER_PATH):
    if filename.endswith(".jpg"):
        filepath = os.path.join(FOLDER_PATH, filename)
        try:
            # 打开图片读取尺寸
            img = Image.open(filepath)
            w, h = img.size
            ratio = round(w / h, 4)
            
            # 记录到数据库
            museum_db.append({
                "name": filename,
                "title": "The Met Collection", # 简化的通用标题
                "ratioVal": ratio,
                "w": w,
                "h": h
            })
        except Exception as e:
            print(f"⚠️ 图片 {filename} 似乎损坏了，已跳过: {e}")

# 🎯 核心：再次按比例 (ratioVal) 从小到大排序！
museum_db.sort(key=lambda x: x["ratioVal"])

# 生成 JS 文件
with open(DB_FILE, "w", encoding="utf-8") as f:
    f.write("const museumDB = " + json.dumps(museum_db, indent=4, ensure_ascii=False) + ";\n")

print(f"\n🎉 抢救成功！共为 {len(museum_db)} 张完美画作生成了数据库！")
print(f"📄 数据库文件已安全存放在: {DB_FILE}")