# Premium Trading Journal - Nhật ký Giao dịch Chuyên nghiệp

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-Live-brightgreen)](https://vuhieuvci.github.io/trading/)

**Trading Journal** là một ứng dụng web chuyên nghiệp được thiết kế để giúp các trader ghi chép, quản lý rủi ro và phân tích hiệu suất giao dịch một cách khoa học. 

Ứng dụng hỗ trợ theo dõi P/L thời gian thực từ sàn Binance, quản lý vị thế theo quy tắc rủi ro cố định và cung cấp bộ công cụ phân tích tâm lý, kỷ luật giao dịch.

---

## 🚀 Tính năng nổi bật

### 📈 Quản lý Rủi ro Thông minh
- **Tính toán khối lượng (Position Sizing)**: Tự động tính số lượng coin/vị thế dựa trên mức rủi ro (%) tài sản bạn chấp nhận mất.
- **Dự kiến R-Multiple**: Hiển thị tỷ lệ Win/Loss (R:R) dự kiến ngay trước khi vào lệnh.

### ⚡ Theo dõi Real-time P/L
- **Tích hợp Binance WebSocket**: Tự động lấy giá thị trường thực tế cho các lệnh đang mở.
- **P/L Chưa chốt**: Theo dõi biến động lợi nhuận/thua lỗ tức thời ngay trong bảng Nhật ký mà không cần mở sàn.

### 📊 Phân tích & Báo cáo Chuyên sâu
- **Biểu đồ Equity**: Theo dõi sự tăng trưởng tài sản theo thời gian.
- **Lịch Lợi nhuận (Profit Calendar)**: Xem tổng hợp lãi/lỗ theo từng ngày trong tháng.
- **Phân tích theo Chiến thuật (Setups)**: Đánh giá chiến thuật nào đang mang lại hiệu quả cao nhất.
- **Điểm Kỷ luật (Discipline Score)**: Tự động tính điểm dựa trên việc tuân thủ TP/SL đã đặt ra.

### 🛡️ Bảo mật & Tiện ích
- **Firebase Authentication**: Đăng nhập cá nhân hóa bằng Email/Mật khẩu.
- **Chế độ riêng tư (Privacy Mode)**: Ẩn/Hiện số dư tài khoản chỉ với 1 cú click.
- **Lưu trữ ảnh biểu đồ**: Hỗ trợ tải lên và lưu trữ ảnh phân tích kỹ thuật trực tiếp vào bộ nhớ trình duyệt (IndexedDB).

---

## 🛠️ Công nghệ sử dụng

- **Frontend**: HTML5, Vanilla CSS, Modern JavaScript (ES6+).
- **Backend**: Firebase Firestore (Cơ sở dữ liệu), Firebase Auth (Xác thực).
- **Charting**: [Chart.js](https://www.chartjs.org/) cho đồ thị.
- **Data Source**: [Binance API](https://binance-docs.github.io/apidocs/spot/en/) cho giá realtime.
- **Icons**: [Lucide Icons](https://lucide.dev/).

---

## 📦 Cài đặt & Chạy ứng dụng

1. **Clone repository**:
   ```bash
   git clone https://github.com/vuhieuvci/trading.git
   ```

2. **Chạy local server**:
   Vì ứng dụng sử dụng ES Modules, bạn cần chạy qua một local server (như Live Server trên VS Code hoặc http-server).
   ```bash
   npx http-server .
   ```

3. **Truy cập**:
   Mở trình duyệt tại địa chỉ `http://localhost:8080`.

---

## 📝 Lưu ý quan trọng
- **Cấu hình Firebase**: Ứng dụng hiện đang sử dụng Firebase Config có sẵn. Nếu bạn muốn deploy riêng, vui lòng thay thế `firebaseConfig` trong file `script.js` bằng cấu hình từ Firebase Console của bạn.
- **Mã cặp tiền**: Khi nhập cặp giao dịch, hãy sử dụng định dạng chuẩn của sàn Binance (ví dụ: `BTCUSDT`, `ETHUSDT`, `SOL/USDT`) để tính năng Real-time P/L hoạt động chính xác.

---

## 🤝 Liên hệ & Đóng góp
Nếu bạn có bất kỳ ý kiến đóng góp hoặc phát hiện lỗi, vui lòng mở một **Issue** hoặc tạo **Pull Request**.

Chúc bạn giao dịch thành công! 💹
