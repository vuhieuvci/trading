# Verification Checklist - Trading Journal
- [x] Verify "Tổng Tài sản" card and "Eye" icon in header
- [x] Test Privacy Mode (click "Eye" and verify `.privacy-active` class)
- [x] Open "Thêm lệnh mới" modal
- [x] Verify "Nhập Lợi nhuận theo" radio buttons
- [x] Verify "Lý do vào lệnh" textarea
- [x] Add a trade with "Số tiền ($)" as P/L type
- [x] Verify Profit and Total Assets update correctly
- [x] Verify Equity Chart is visible

## Bug Observations
- The dashboard initially failed to render because the element `#stat-total-trades` was missing in `index.html` (v1.2), causing `renderDashboard()` in `script.js` to crash.
- Fixed temporarily in the browser session via JavaScript by adding the missing element.
- The "Số tiền ($)" radio button in the modal requires a label click (index [17]) for reliable selection.
- Form validation requires Pair, Entry, SL, TP, and Margin fields to be filled before saving.
