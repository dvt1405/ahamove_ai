# Trang trình chiếu AI Ahamove

Ứng dụng Next.js tạo slide hình ảnh và câu chuyện tiếng Việt dựa trên dữ liệu sử dụng Ahamove trong năm qua. Hình ảnh được sinh bởi Google AI Studio (Gemini), bám màu thương hiệu Ahamove (cam, trắng, xanh đậm), bối cảnh thành phố, yếu tố UI-floating (thẻ lịch sử, đường đi, xu/coin, số liệu) và tông AI hiện đại, thân thiện.

## Tính năng chính
- Form nhập dữ liệu người dùng (đơn hoàn thành, dịch vụ đã dùng, gói đăng ký, tổng chi tiêu VND, khoảng thời gian) và số lượng ảnh (1–6, mặc định 3).
- Gọi API server `/api/generate` để sinh:
  - `images`: mảng ảnh `data:image/png;base64,...`
  - `stories`: danh sách truyện tiếng Việt (≤ 100 từ/ảnh)
  - Slide tổng kết người dùng (nhãn tiếng Việt)
  - Slide chọn anh hùng (10 anh hùng, mặc định “Người bán hàng xuất sắc nhất thế giới”)
- Fallback: khi thiếu khóa hoặc lỗi API, hiển thị ảnh SVG minh họa + truyện mẫu tiếng Việt.

## Cấu hình môi trường (.env)
Tạo file `.env.local` ở thư mục gốc với nội dung:
```
GOOGLE_API_KEY=your-google-ai-studio-key
# Tuỳ chọn đổi model nếu cần
GEMINI_IMAGE_MODEL=models/imagegeneration
GEMINI_TEXT_MODEL=gemini-2.5
```
Lưu ý: Biến môi trường chỉ dùng phía server (API route), không lộ sang client. Nếu deploy (Vercel/khác), thêm biến môi trường trong trang quản trị của nền tảng.

## Chạy dự án
```bash
npm install
npm run dev
```
Mở http://localhost:3000, nhập dữ liệu → bấm “Tạo”. Nếu chưa cấu hình `GOOGLE_API_KEY`, ứng dụng sẽ dùng ảnh SVG minh họa và truyện mẫu để demo.

## API server
- Endpoint: `POST /api/generate`
- Body mẫu:
```json
{
  "count": 3,
  "user": {
    "completedOrders": 128,
    "serviceIds": ["EXPRESS", "INSTANT"],
    "subscriptions": ["Pro", "Loyalty+"],
    "totalSpentVnd": 12000000,
    "dateRange": "11/2024–11/2025"
  }
}
```
- Phản hồi: `{ images: string[], stories: string[], userSlide: { ... }, heroes: string[], defaultHeroIndex: number }`

## Ghi chú kỹ thuật
- Luồng chính gọi Google Generative Language API (REST v1beta):
  - Sinh ảnh: `v1beta/models/{GEMINI_IMAGE_MODEL}:generateImages`
  - Sinh truyện: `v1beta/models/{GEMINI_TEXT_MODEL}:generateContent`
- File trợ giúp được giữ theo yêu cầu: `app/api/generate/gemini.ts`
  - Ưu tiên `GOOGLE_API_KEY` (chấp nhận `API_KEY` như alias cũ)
  - Có hàm `editImageWithGemini` (chỉnh sửa ảnh theo prompt)
  - Có hàm `generateImagesViaGemini(prompt, count, aspectRatio?)` hỗ trợ sinh ảnh (được `route.ts` dùng ưu tiên)
- Tất cả truyện được giới hạn ≤ 100 từ ở bước hậu xử lý.

## Xử lý sự cố thường gặp
- 401/403: kiểm tra `GOOGLE_API_KEY` đúng và có quyền gọi model.
- 429/Quota: chờ cooldown hoặc tăng hạn mức; app sẽ fallback sang SVG minh họa.
- Model ID khác: đổi qua biến `GEMINI_IMAGE_MODEL`, `GEMINI_TEXT_MODEL` trong `.env.local`.

## Bảo mật
- Không log khóa API; chỉ log lỗi tổng quát.
- Biến môi trường chỉ đọc ở server (route API), tuyệt đối không đưa lên client.



## Mission APIs

Two endpoints power the mission cards for generating hero images and captions. They reuse the Gemini integration and gracefully fall back when `GOOGLE_API_KEY` is not set.

### POST /api/hero/image
- Purpose: Generate 1–2 brand-aligned images for the selected hero.
- Request JSON:
```json
{
  "heroName": "Bậc thầy tối ưu lộ trình",
  "user": {
    "completedOrders": 128,
    "serviceIds": ["EXPRESS", "INSTANT"],
    "subscriptions": ["Pro"],
    "totalSpentVnd": 12000000,
    "dateRange": "11/2024–11/2025"
  },
  "promptOverride": "(optional) custom prompt...",
  "count": 1,
  "aspectRatio": "1:1"
}
```
- Response JSON (200):
```json
{
  "ok": true,
  "data": {
    "images": ["data:image/png;base64,..."],
    "usedPrompt": "..."
  }
}
```
- Validation errors: 400 with `{ ok:false, error }`
- Server errors: 500 with `{ ok:false, error }`

If no API key or a model error occurs, the endpoint returns SVG placeholders with the same shape.

### POST /api/hero/caption
- Purpose: Generate a concise Vietnamese caption (≤120 từ), with benefits + CTA + 3 hashtags. Can optionally consider a chosen image URL.
- Request JSON:
```json
{
  "heroName": "Bậc thầy tối ưu lộ trình",
  "user": {
    "completedOrders": 128,
    "serviceIds": ["EXPRESS", "INSTANT"],
    "subscriptions": ["Pro"],
    "totalSpentVnd": 12000000,
    "dateRange": "11/2024–11/2025"
  },
  "chosenImageUrl": "data:image/png;base64,...",
  "extraNotes": "(optional)"
}
```
- Response JSON (200):
```json
{
  "ok": true,
  "data": {
    "caption": "...",
    "usedPrompt": "..."
  }
}
```
- Validation errors: 400 with `{ ok:false, error }`
- Server errors: 500 with `{ ok:false, error }`

### Environment
- `GOOGLE_API_KEY` (required for real generation; otherwise placeholders/templates are used)
- Optional: `GEMINI_IMAGE_MODEL` (default `models/imagegeneration`), `GEMINI_TEXT_MODEL` (default `gemini-2.5`)

### Frontend usage
- Image mission button label was changed to "Thử tạo ngay" and triggers `/api/hero/image` inline, rendering a mini gallery with Download and Copy Link.
- Caption mission adds an image source picker (choose from slideshow or upload), and triggers `/api/hero/caption`. The result shows copy button and a Facebook-style preview.
- Chat-to-Book link points to https://chat.ahamove.com/
- “Yêu cầu hỗ trợ quảng bá” points to https://www.facebook.com/AhamoveVietNam/
