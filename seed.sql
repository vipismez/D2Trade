-- D2Trade 种子数据
-- 默认 GM 账号：admin / admin123
-- PBKDF2 哈希（100,000 次迭代 SHA-256）
-- 密码: admin123

INSERT INTO users (username, password_hash, qq, role, status, points)
VALUES ('admin', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855:d0e6f2f9b8a7c3d1e5f4a7b9c2d8e6f3', '000000', 'gm', 'approved', 999999);
