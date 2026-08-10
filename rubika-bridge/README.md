# MTchat ⇄ Rubika bridge

پنل MTchat روی Cloudflare Worker اجرا می‌شود و نمی‌تواند خودش سوکت مستقیم روبیکا
را نگه دارد. بنابراین یک «کارگر» پایتونی (rubpy) نشست واقعی حساب روبیکا را نگه
می‌دارد و از طریق HTTP به پنل وصل می‌شود. هیچ API واسط شخص‌ثالثی وجود ندارد؛
لاگین با شماره + کد پیامکی خود حساب انجام می‌شود.

```
Rubika  ⇄  bridge.py (rubpy)  ⇄  MTchat server  ⇄  پنل (مرورگر)
```

## اجرا

```bash
cd rubika-bridge
pip install -r requirements.txt
export MTCHAT_BASE_URL="https://<your-app>.lovable.app"
export RUBIKA_BRIDGE_SECRET="<همان مقداری که در پنل ذخیره شده>"
python bridge.py
```

## ریکوئست‌هایی که سمت سرور رد و بدل می‌شود

| متد | مسیر | فرستنده | کاربرد |
|---|---|---|---|
| POST | `/api/public/rubika/inbound` | کارگر | تحویل پیام‌های تازه |
| GET | `/api/public/rubika/outbox` | کارگر | برداشتن پیام‌های خروجی و دستورات |
| POST | `/api/public/rubika/outbox` | کارگر | ضربان قلب / وضعیت / لیست چت‌ها |
| GET | `/api/rubika/state?since=n` | پنل | وضعیت + پیام‌های جدید |
| POST | `/api/rubika/state` | پنل | `send` یا `command` (login/code/logout) |

همه ریکوئست‌های کارگر باید هدر `x-bridge-secret: $RUBIKA_BRIDGE_SECRET` داشته باشند.

### نمونه پیام ورودی

```bash
curl -X POST "$MTCHAT_BASE_URL/api/public/rubika/inbound" \
  -H "x-bridge-secret: $RUBIKA_BRIDGE_SECRET" \
  -H "content-type: application/json" \
  -d '{"messages":[{"chatGuid":"u0abc","chatTitle":"محمد رضایی","authorGuid":"u0abc",
       "messageId":"991","type":"Text","text":"سلام","isMe":false,
       "createdAt":"2026-08-10T00:00:00.000Z"}]}'
```

پنل هر ۳ ثانیه `/api/rubika/state` را می‌خواند، هر چت روبیکا را به مخاطب و گفتگوی
داخلی تبدیل می‌کند و بر اساس قوانین مسیریابی (قانون شماره → آخرین کاربر فعال →
کم‌بارترین کاربر) بین کاربران تقسیم می‌کند.
