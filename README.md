# VMP Server List 🎮

لیست سرورهای FiveM روی پلتفرم VMP با قابلیت جستجو و فیلتر.

## ویژگی‌ها

- 🔍 جستجوی سرور بر اساس نام، تگ و نوع بازی
- 🟢 نمایش وضعیت آنلاین/آفلاین سرورها
- ⭐ نمایش سرورهای ویژه (Premium)
- 📊 آمار کلی (تعداد سرور، بازیکن آنلاین)
- 🔄 بروزرسانی خودکار هر 60 ثانیه
- 🎨 طراحی مدرن و ریسپانسیو
- 🔗 دکمه اتصال مستقیم به سرور

## اجرا روی لوکال

```bash
cd servers-site
node server.js
```

سپس مرورگر رو باز کنید: `http://localhost:3000`

## استقرار روی GitHub Pages

1. ریپو رو روی GitHub آپلود کنید
2. وارد Settings > Pages بشید
3. Source رو روی `main` branch و پوشه `/servers-site` بذارید
4. Save کنید

سایت شما روی آدرس زیر قابل دسترسی خواهد بود:
```
https://<username>.github.io/<repo-name>/
```

## فناوری‌ها

- HTML / CSS / Vanilla JavaScript
- Vazirmatn Font (فونت فارسی)
- VMP API برای دریافت لیست سرورها
