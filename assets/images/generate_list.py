import os
import json
from PIL import Image
from fractions import Fraction

# ================= 配置区 =================
# 你的博物馆照片存放的文件夹路径 (相对或绝对路径)
# 1. 获取当前这个 .py 文件所在的母文件夹的绝对路径
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# 2. 自动把母文件夹路径和你的图片文件夹名字拼在一起
FOLDER_PATH = os.path.join(BASE_DIR, "Scheidegger") 

print(f"正在读取的文件夹路径是: {FOLDER_PATH}") # 你可以打印出来看看，非常安心

# 根据你的需求：设定横屏的固定宽度，和竖屏/方图的固定高度
TARGET_LANDSCAPE_W = 400  # 横图固定宽度
TARGET_PORTRAIT_H = 600   # 竖图/方图固定高度

# 极限值保护：如果计算出的 W 超过了这个值，就强制把 W 设为 FALLBACK_W
MAX_W_LIMIT = 400        # 如果是笔误，请把这里改成 400
FALLBACK_W = 400          # 触发限制后，强制设定的 W 值
# ==========================================

sequence_list = []
valid_exts = ('.png', '.jpg', '.jpeg', '.webp')

for filename in os.listdir(FOLDER_PATH):
    if filename.lower().endswith(valid_exts):
        filepath = os.path.join(FOLDER_PATH, filename)
        
        try:
            with Image.open(filepath) as img:
                orig_w, orig_h = img.size
                
                # 1. 计算比例字符串
                frac = Fraction(orig_w, orig_h).limit_denominator(100)
                ratio_str = f"{frac.numerator}:{frac.denominator}"
                
                # 2. 初始长宽计算
                if orig_w > orig_h:
                    # 横图规则：宽固定 400，算高
                    final_w = TARGET_LANDSCAPE_W
                    final_h = final_w * (orig_h / orig_w)
                else:
                    # 竖图/方图规则：高固定 600，算宽
                    final_h = TARGET_PORTRAIT_H
                    final_w = final_h * (orig_w / orig_h)
                
                # 3. 触发超宽限制兜底
                if final_w > MAX_W_LIMIT:
                    final_w = FALLBACK_W
                    # 既然 W 被强制改变了，H 必须按原始比例重新计算，保证图片不变形
                    final_h = final_w * (orig_h / orig_w)
                    
                # 4. 保留两位小数并存入列表
                sequence_list.append({
                    "ratio": ratio_str,
                    "w": round(final_w, 2),
                    "h": round(final_h, 2),
                    "name": filename
                })
        except Exception as e:
            print(f"无法读取图片 {filename}: {e}")

# 输出 JS 代码
print("const sequence = " + json.dumps(sequence_list, indent=4, ensure_ascii=False) + ";")