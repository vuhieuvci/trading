# TÍNH NĂNG ĐĂNG KÝ VÀ ĐĂNG NHẬP TÀI KHOẢN (AUTH)

Trang hiển thị Nhật ký giao dịch hiện tại lưu toàn bộ dữ liệu trên trình duyệt. Để hỗ trợ đăng ký và đăng nhập, hệ thống sẽ được nâng cấp thành một ứng dụng đa người dùng cục bộ, trong đó mỗi tài khoản sẽ có một không gian lưu trữ dữ liệu riêng.

> [!IMPORTANT]  
> Dữ liệu được quản lý cục bộ (Local Storage). Tính năng đăng ký/đăng nhập giúp bạn tạo ra các hồ sơ (Profiles) khác nhau. Bạn có thể tạo nhiều tài khoản (ví dụ: một tài khoản cho Spot, một tài khoản cho Futures) và dữ liệu của chúng sẽ hoàn toàn độc lập.

## Phương án triển khai

### 1. Cấu trúc dữ liệu
Chúng ta sẽ lưu một bảng `users` trong LocalStorage để chứa thông tin tài khoản.
- Tài khoản hiện tại được lưu dưới tên `currentUser`.
- Các dữ liệu khác như `trades`, `settings` sẽ được đổi tên (namespace) để gán cho từng user. Thay vì `trading_journal_trades`, sẽ là `trading_journal_trades_<tên-tài-khoản>`. Điều này tránh việc các cấu hình hoặc dữ liệu lệnh bị trùng lặp.

### 2. Sửa đổi Giao diện (`index.html` & `styles.css`)
- Thêm một giao diện **Auth Overlay** (Cửa sổ Đăng nhập/Đăng ký) chiếm toàn bộ màn hình khi chưa đăng nhập. Ứng dụng chính (Dashboard, Nhật ký) sẽ bị ẩn.
- Hai chế độ: **Đăng nhập** và **Đăng ký**.
- Form yêu cầu: Tên đăng nhập và Mật khẩu.
- Thêm nút **Đăng xuất (Logout)** trên thanh điều hướng chính.

### 3. Sửa đổi Logic (`script.js`)
- **Init Auth:** Khi tải trang, kiểm tra xem `currentUser` có tồn tại không. Nếu không, hiển thị màn hình Đăng nhập. Nếu có, tiến hành tải dữ liệu của user đó và hiển thị Dashboard.
- **Register:** Kiểm tra tên đăng nhập đã tồn tại chưa, nếu chưa thì tạo mới và tự động đăng nhập.
- **Login:** Kiểm tra mật khẩu khớp, lưu phiên bảo mật vào `currentUser` và nạp lại trang/dữ liệu.
- **Logout:** Xóa `currentUser` và tải lại trang.
- Đảm bảo tất cả các hàm `saveTrades()`, `saveSettings()` lưu đúng vào key của user đang đăng nhập.

## Kiểm tra sau khi triển khai
- Thử đăng ký tài khoản `test1` / `123`.
- Đăng nhập vào và thêm 1 lệnh.
- Đăng xuất.
- Đăng nhập bằng tài khoản `test2` (tạo mới) và kiểm tra màn hình phải hoàn toàn trống, không chứa lệnh của `test1`.

Tôi sẽ tiến hành cập nhật ứng dụng của bạn sau khi bạn xem qua nhé!
