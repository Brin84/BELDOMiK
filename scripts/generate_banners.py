import requests
import json
from PIL import Image, ImageDraw, ImageFont
import io
import os

TARGET_SIZE = (1080, 604)
BANNERS_DIR = 'frontend/public/banners'
FONTS = {
    'bold': 'C:/Windows/Fonts/segoeuib.ttf',
    'regular': 'C:/Windows/Fonts/segoeui.ttf'
}

TEXTS = [
    {
        'title': 'BELDOMiK — недвижимость Беларуси',
        'subtitle': 'Квартиры, дома, участки и коммерция',
        'cta': 'Смотреть объявления'
    },
    {
        'title': 'Разместите объявление',
        'subtitle': 'Бесплатно и за пару минут',
        'cta': 'Добавить объявление'
    },
    {
        'title': 'Новые объявления каждый день',
        'subtitle': 'Подпишитесь на канал BELDOMiK',
        'cta': 'Открыть канал'
    }
]

def fetch_images():
    sources = [
        'https://upload.wikimedia.org/wikipedia/commons/f/f5/Lima_Peru_city_-_Modern_Apartment_-_interior.jpg',
        'https://upload.wikimedia.org/wikipedia/commons/thumb/4/49/Modern_living_room_with_stylish_furniture_and_a_view_/800px-Modern_living_room_with_stylish_furniture_and_a_view_.jpg',
        'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6a/Elegant_dining_area_in_a_modern_apartment_with_wooden/800px-Elegant_dining_area_in_a_modern_apartment_with_wooden.jpg'
    ]
    return sources

def download_image(url):
    headers = {'User-Agent': 'BELDOMiK/1.0'}
    r = requests.get(url, headers=headers, timeout=30)
    r.raise_for_status()
    return Image.open(io.BytesIO(r.content))

def process_image(img):
    width, height = img.size
    target_w, target_h = TARGET_SIZE
    ratio = max(target_w / width, target_h / height)
    new_w = int(width * ratio)
    new_h = int(height * ratio)
    img_resized = img.resize((new_w, new_h), Image.LANCZOS)
    left = (new_w - target_w) // 2
    top = (new_h - target_h) // 2
    right = left + target_w
    bottom = top + target_h
    cropped = img_resized.crop((left, top, right, bottom))
    return cropped

def add_text(draw, text_data, font_bold, font_regular):
    title = text_data['title']
    subtitle = text_data['subtitle']
    cta = text_data['cta']
    
    bbox_title = font_bold.getbbox(title)
    title_w = bbox_title[2] - bbox_title[0]
    title_h = bbox_title[3] - bbox_title[1]
    
    bbox_sub = font_regular.getbbox(subtitle)
    sub_w = bbox_sub[2] - bbox_sub[0]
    
    padding = 40
    x = padding
    y = 40
    
    draw.text((x, y), title, fill='white', font=font_bold)
    y += title_h + 10
    draw.text((x, y), subtitle, fill='#e2e8f0', font=font_regular)
    
    cta_y = y + 60
    btn_height = 50
    btn_width = 200
    btn_x = x
    btn_y = cta_y
    
    draw.rounded_rectangle([(btn_x, btn_y), (btn_x + btn_width, btn_y + btn_height)], radius=12, fill='#2563eb')
    
    bbox_cta = font_regular.getbbox(cta)
    cta_w = bbox_cta[2] - bbox_cta[0]
    cta_h = bbox_cta[3] - bbox_cta[1]
    cta_x = btn_x + (btn_width - cta_w) // 2
    cta_y_offset = btn_y + (btn_height - cta_h) // 2
    draw.text((cta_x, cta_y_offset), cta, fill='white', font=font_regular)

def main():
    print('Fetching image URLs...')
    urls = fetch_images()
    print(f'Found {len(urls)} images')
    
    os.makedirs(BANNERS_DIR, exist_ok=True)
    
    font_bold = ImageFont.truetype(FONTS['bold'], 48)
    font_regular = ImageFont.truetype(FONTS['regular'], 32)
    
    for i, url in enumerate(urls):
        print(f'Downloading image {i+1}/{len(urls)}: {url[:60]}...')
        img = download_image(url)
        print(f'Processing image {i+1}...')
        processed = process_image(img)
        
        draw_img = processed.copy()
        draw_obj = ImageDraw.Draw(draw_img)
        
        add_text(draw_obj, TEXTS[i], font_bold, font_regular)
        
        output_path = os.path.join(BANNERS_DIR, f'beldomik-promo-{i+1}.webp')
        draw_img.save(output_path, 'WEBP', quality=85)
        print(f'Saved: {output_path}')
    
    print('Done!')

if __name__ == '__main__':
    main()